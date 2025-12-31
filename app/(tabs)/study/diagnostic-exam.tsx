import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { mlClient } from '@/lib/ml-backend-client';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import QuestionRenderer from '@/components/study/QuestionRenderer';
import { CheckCircle, AlertCircle } from 'lucide-react-native';
import { Question } from '@/types/question';
import { validateAnswer } from '@/lib/answer-validator';

export default function DiagnosticExamScreen() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [startTime] = useState<number>(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [submitting, setSubmitting] = useState(false);
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

  const handleNext = async () => {
    const currentQuestion = questions[currentIndex];
    const currentAnswer = answers[currentIndex];

    if (!currentAnswer) {
      Alert.alert('Answer Required', 'Please select an answer before continuing.');
      return;
    }

    const validation = validateAnswer(currentQuestion, currentAnswer);
    if (!validation.isValid) {
      Alert.alert('Invalid Answer', validation.error || 'Please select a valid answer.');
      return;
    }

    setSubmitting(true);
    try {
      const responseTime = Date.now() - questionStartTime;

      await mlClient.submitDiagnosticAnswer({
        user_id: profile!.ml_user_id!,
        question_id: currentQuestion.id,
        answer: currentAnswer,
        response_time_ms: responseTime,
      });

      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setQuestionStartTime(Date.now());
      } else {
        await completeDiagnostic();
      }
    } catch (err: any) {
      console.error('[DiagnosticExam] Error submitting answer:', err);
      Alert.alert('Error', 'Failed to submit answer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const completeDiagnostic = async () => {
    try {
      setSubmitting(true);

      const result = await mlClient.completeDiagnosticExam(profile!.ml_user_id!);

      await supabase
        .from('profiles')
        .update({
          diagnostic_completed: true,
          diagnostic_completed_at: new Date().toISOString(),
          diagnostic_score: result.total_score,
          diagnostic_attempt_id: result.attempt_id,
        })
        .eq('id', profile!.id);

      await refreshProfile();

      router.replace('/study/diagnostic-results');
    } catch (err: any) {
      console.error('[DiagnosticExam] Error completing diagnostic:', err);
      Alert.alert('Error', 'Failed to complete diagnostic. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <PageHeader title="Diagnostic Assessment" showBack onBackPress={() => router.back()} />
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
        <PageHeader title="Diagnostic Assessment" showBack onBackPress={() => router.back()} />
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <QuestionRenderer
          question={currentQuestion}
          selectedAnswer={answers[currentIndex]}
          onAnswerChange={handleAnswerChange}
          showExplanation={false}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[
            styles.nextButton,
            (!answers[currentIndex] || submitting) && styles.nextButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!answers[currentIndex] || submitting}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Text style={styles.nextButtonText}>
                {currentIndex === questions.length - 1 ? 'Complete Assessment' : 'Next Question'}
              </Text>
              <CheckCircle size={20} color={Colors.white} />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    color: Colors.textSecondary,
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
    borderBottomColor: Colors.border,
  },
  instructionsText: {
    fontSize: Typography.small.fontSize,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  progressContainer: {
    marginTop: Spacing.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.border,
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
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  footer: {
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
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
