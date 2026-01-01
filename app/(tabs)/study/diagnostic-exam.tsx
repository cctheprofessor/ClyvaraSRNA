import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { mlClient } from '@/lib/ml-backend-client';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import QuestionRenderer from '@/components/study/QuestionRenderer';
import { CheckCircle, AlertCircle, Send, ArrowRight } from 'lucide-react-native';
import { Question, AnswerFormat } from '@/types/question';
import { validateAnswer } from '@/lib/answer-validator';
import { rationaleCacheService } from '@/lib/rationale-cache-service';

interface DiagnosticAnswer {
  question_id: string;
  answer: string;
  response_time_ms: number;
  is_correct?: boolean;
}

interface AnswerResult {
  is_correct: boolean;
  rationale?: string;
  option_rationales?: Record<string, string>;
  correct_answers?: string[];
}

export default function DiagnosticExamScreen() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [answerResults, setAnswerResults] = useState<Record<number, AnswerResult>>({});
  const [currentAnswerSubmitted, setCurrentAnswerSubmitted] = useState(false);
  const [diagnosticAnswers, setDiagnosticAnswers] = useState<DiagnosticAnswer[]>([]);
  const [startTime] = useState<number>(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [rationaleLoading, setRationaleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDiagnosticQuestions();
  }, []);

  const loadDiagnosticQuestions = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!profile?.ml_user_id) {
        setError('Your account is not synced. Please contact support.');
        setLoading(false);
        return;
      }

      const diagnosticQuestions = await mlClient.getDiagnosticQuestions(profile.ml_user_id);

      if (diagnosticQuestions.length === 0) {
        setError('No diagnostic questions available. Please try again later.');
        setLoading(false);
        return;
      }

      setQuestions(diagnosticQuestions);
      setQuestionStartTime(Date.now());
      setLoading(false);
    } catch (err: any) {
      console.error('[DiagnosticExam] Error loading questions:', err);
      setError(err.message || 'Failed to load diagnostic exam. Please try again.');
      setLoading(false);
    }
  };

  const handleAnswerChange = (answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentIndex]: answer,
    }));
  };

  const parseAnswer = (question: Question, serializedAnswer: string): AnswerFormat | null => {
    try {
      switch (question.question_type) {
        case 'multiple_choice':
          return { type: 'multiple_choice', answer: serializedAnswer };
        case 'multi_select':
          return { type: 'multi_select', answers: JSON.parse(serializedAnswer) };
        case 'drag_drop_matching':
          return { type: 'drag_drop_matching', pairs: JSON.parse(serializedAnswer) };
        case 'drag_drop_ordering':
          return { type: 'drag_drop_ordering', order: JSON.parse(serializedAnswer) };
        case 'clinical_scenario':
          return { type: 'clinical_scenario', sub_answers: JSON.parse(serializedAnswer) };
        case 'hotspot':
          return { type: 'hotspot', zone_id: serializedAnswer };
        default:
          return null;
      }
    } catch (error) {
      console.error('[DiagnosticExam] Failed to parse answer:', error);
      return null;
    }
  };

  const handleSubmitAnswer = async () => {
    const currentQuestion = questions[currentIndex];
    const currentAnswer = answers[currentIndex];

    if (!currentAnswer) {
      return;
    }

    const parsedAnswer = parseAnswer(currentQuestion, currentAnswer);
    if (!parsedAnswer) {
      console.error('[DiagnosticExam] Failed to parse answer');
      return;
    }

    const validationResult = validateAnswer(currentQuestion, parsedAnswer);
    const responseTime = Date.now() - questionStartTime;

    const diagnosticAnswer: DiagnosticAnswer = {
      question_id: currentQuestion.id,
      answer: currentAnswer,
      response_time_ms: responseTime,
      is_correct: validationResult.is_correct,
    };

    setDiagnosticAnswers(prev => [...prev, diagnosticAnswer]);
    setCurrentAnswerSubmitted(true);
    setRationaleLoading(true);

    try {
      const backendResult = await mlClient.submitDiagnosticAnswer({
        user_id: profile!.ml_user_id!,
        question_id: currentQuestion.id,
        answer: currentAnswer,
        response_time_ms: responseTime,
      });

      if (backendResult.success && backendResult.rationale) {
        setAnswerResults(prev => ({
          ...prev,
          [currentIndex]: {
            is_correct: backendResult.is_correct ?? validationResult.is_correct,
            rationale: backendResult.rationale,
            option_rationales: backendResult.option_rationales,
            correct_answers: backendResult.correct_answers || validationResult.correct_answers,
          },
        }));
        setRationaleLoading(false);

        await rationaleCacheService.setRationale(currentQuestion.id, {
          rationale: backendResult.rationale,
          option_rationales: backendResult.option_rationales,
          correct_answers: backendResult.correct_answers || validationResult.correct_answers,
        });
        return;
      }
    } catch (err) {
      console.log('[DiagnosticExam] Backend submission failed, falling back to cache and local validation');
    }

    const cachedRationale = await rationaleCacheService.getRationale(currentQuestion.id);

    if (cachedRationale) {
      setAnswerResults(prev => ({
        ...prev,
        [currentIndex]: {
          is_correct: validationResult.is_correct,
          rationale: cachedRationale.rationale || validationResult.explanation || validationResult.rationale,
          option_rationales: cachedRationale.option_rationales,
          correct_answers: cachedRationale.correct_answers || validationResult.correct_answers,
        },
      }));
      setRationaleLoading(false);
    } else {
      setAnswerResults(prev => ({
        ...prev,
        [currentIndex]: {
          is_correct: validationResult.is_correct,
          rationale: validationResult.explanation || validationResult.rationale,
          correct_answers: validationResult.correct_answers,
        },
      }));
      setRationaleLoading(false);
    }
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setQuestionStartTime(Date.now());
      setCurrentAnswerSubmitted(false);
    } else {
      await completeDiagnostic();
    }
  };

  const completeDiagnostic = async () => {
    try {
      setSubmitting(true);

      const totalScore = diagnosticAnswers.filter(a => a.is_correct).length;
      const attemptId = `diagnostic_${profile!.id}_${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          diagnostic_completed: true,
          diagnostic_completed_at: new Date().toISOString(),
          diagnostic_score: totalScore,
          diagnostic_attempt_id: attemptId,
        })
        .eq('id', profile!.id);

      if (updateError) {
        console.error('[DiagnosticExam] Error updating profile:', updateError);
        throw updateError;
      }

      try {
        await mlClient.completeDiagnosticExam(profile!.ml_user_id!);
      } catch (err) {
        console.log('[DiagnosticExam] Backend completion failed, continuing with local data');
      }

      await refreshProfile();

      router.replace('/(tabs)/study/diagnostic-results');
    } catch (err: any) {
      console.error('[DiagnosticExam] Error completing diagnostic:', err);
      Alert.alert('Error', 'Failed to complete diagnostic. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <PageHeader title="Diagnostic Assessment" subtitle="Loading your exam" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your diagnostic exam...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <PageHeader title="Diagnostic Assessment" subtitle="Error loading exam" />
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={loadDiagnosticQuestions}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <View style={styles.container}>
      <PageHeader title="Diagnostic Assessment" />

      <View style={styles.header}>
        <Text style={styles.instructionsText}>
          Complete all 50 questions to personalize your learning experience
        </Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            Question {currentIndex + 1} of {questions.length}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <QuestionRenderer
          question={currentQuestion}
          onAnswerChange={handleAnswerChange}
          showResult={currentAnswerSubmitted}
          isCorrect={answerResults[currentIndex]?.is_correct}
          rationale={answerResults[currentIndex]?.rationale}
          optionRationales={answerResults[currentIndex]?.option_rationales}
          correctAnswers={answerResults[currentIndex]?.correct_answers}
          disabled={currentAnswerSubmitted}
          rationaleLoading={rationaleLoading}
        />
      </ScrollView>

      <View style={styles.footer}>
        {!currentAnswerSubmitted ? (
          <Pressable
            style={[
              styles.submitButton,
              !answers[currentIndex] && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmitAnswer}
            disabled={!answers[currentIndex]}
          >
            <Send color={Colors.white} size={20} />
            <Text style={styles.submitButtonText}>Submit Answer</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[
              styles.nextButton,
              (rationaleLoading || submitting) && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={rationaleLoading || submitting}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Text style={styles.nextButtonText}>
                  {currentIndex === questions.length - 1 ? 'Complete Assessment' : 'Next Question'}
                </Text>
                {currentIndex === questions.length - 1 ? (
                  <CheckCircle size={20} color={Colors.white} />
                ) : (
                  <ArrowRight size={20} color={Colors.white} />
                )}
              </>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.body.fontSize,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    marginTop: Spacing.md,
    fontSize: Typography.body.fontSize,
    color: Colors.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
  },
  header: {
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  instructionsText: {
    fontSize: Typography.small.fontSize,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  progressContainer: {
    marginTop: Spacing.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.border.light,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  progressText: {
    marginTop: Spacing.xs,
    fontSize: Typography.small.fontSize,
    color: Colors.text.secondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
  },
  footer: {
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: Colors.white,
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
  },
});
