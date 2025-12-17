import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { mlClient } from '@/lib/ml-backend-client';
import { offlinePracticeManager } from '@/lib/offline-practice-manager';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import QuestionRenderer from '@/components/study/QuestionRenderer';
import SessionResults from '@/components/study/SessionResults';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react-native';
import { Question } from '@/types/question';

interface AnswerResult {
  is_correct: boolean;
  response_time: number;
  rationale?: string;
  option_rationales?: Record<string, string>;
  correct_answers?: string[];
}

export default function Practice25Screen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [answerResults, setAnswerResults] = useState<Record<number, AnswerResult>>({});
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [showResults, setShowResults] = useState(false);
  const [sessionResults, setSessionResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!profile?.ml_user_id) {
        setError('ML sync required. Please complete your profile.');
        setLoading(false);
        return;
      }

      const cachedQuestions = await offlinePracticeManager.getRandomCachedQuestions(profile.ml_user_id, 25);

      if (cachedQuestions.length >= 25) {
        console.log('Loading questions from cache (fast path)');
        setQuestions(cachedQuestions);
        setStartTime(Date.now());
        setQuestionStartTime(Date.now());
        setLoading(false);
        return;
      }

      console.log('Cache insufficient, fetching from API...');
      try {
        const fetchedQuestions = await mlClient.getNextQuestions(profile.ml_user_id, 25);
        setQuestions(fetchedQuestions);
      } catch (apiError) {
        console.log('API failed, using available cache...');
        if (cachedQuestions.length > 0) {
          setQuestions(cachedQuestions);
        } else {
          throw new Error('No questions available. Please ensure you have an internet connection and try again.');
        }
      }

      setStartTime(Date.now());
      setQuestionStartTime(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (serializedAnswer: string) => {
    setAnswers({ ...answers, [currentIndex]: serializedAnswer });
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      await submitCurrentAnswer();
      setCurrentIndex(currentIndex + 1);
      setQuestionStartTime(Date.now());
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setQuestionStartTime(Date.now());
    }
  };

  const submitCurrentAnswer = async () => {
    const currentQuestion = questions[currentIndex];
    const serializedAnswer = answers[currentIndex];

    if (!serializedAnswer || !profile?.ml_user_id) return;

    const responseTime = Math.floor((Date.now() - questionStartTime) / 1000);

    try {
      const result = await mlClient.submitAnswer({
        student_id: profile.ml_user_id,
        question_id: currentQuestion.id,
        student_answer: serializedAnswer,
        response_time_seconds: responseTime,
      });

      setAnswerResults({
        ...answerResults,
        [currentIndex]: {
          is_correct: result.is_correct,
          response_time: responseTime,
          rationale: result.rationale,
          option_rationales: result.option_rationales,
          correct_answers: result.correct_answers,
        },
      });
    } catch (error) {
      await offlinePracticeManager.queueResponse({
        student_id: profile.ml_user_id,
        question_id: currentQuestion.id,
        student_answer: serializedAnswer,
        response_time_seconds: responseTime,
        answered_at: new Date().toISOString(),
      });
    }
  };

  const handleFinish = async () => {
    await submitCurrentAnswer();

    const totalTime = Math.floor((Date.now() - startTime) / 1000);

    // Count correct answers from backend results
    const correctCount = Object.values(answerResults).filter((result) => result.is_correct).length;

    try {
      if (profile?.ml_user_id) {
        const insights = await mlClient.getStudentInsights(profile.ml_user_id);
        setSessionResults({
          totalQuestions: questions.length,
          correctAnswers: correctCount,
          totalTime,
          insights: insights.overall_performance,
        });
      } else {
        setSessionResults({
          totalQuestions: questions.length,
          correctAnswers: correctCount,
          totalTime,
        });
      }
    } catch (error) {
      setSessionResults({
        totalQuestions: questions.length,
        correctAnswers: correctCount,
        totalTime,
      });
    }

    setShowResults(true);
  };

  const progress = ((currentIndex + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  if (loading) {
    return (
      <View style={styles.container}>
        <PageHeader title="25 Questions" subtitle="Loading practice session" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Preparing your questions...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <PageHeader title="25 Questions" subtitle="Practice Mode" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={loadQuestions}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (showResults && sessionResults) {
    return (
      <View style={styles.container}>
        <SessionResults
          {...sessionResults}
          onContinue={() => router.back()}
        />
      </View>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <View style={styles.container}>
      <PageHeader
        title="25 Questions"
        subtitle={`Question ${currentIndex + 1} of ${questions.length}`}
      />

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.stats}>
          <Text style={styles.statsText}>
            Answered: {answeredCount}/{questions.length}
          </Text>
        </View>

        <QuestionRenderer
          question={currentQuestion}
          onAnswerChange={handleAnswerChange}
          showResult={!!answerResults[currentIndex]}
          isCorrect={answerResults[currentIndex]?.is_correct}
          rationale={answerResults[currentIndex]?.rationale}
          optionRationales={answerResults[currentIndex]?.option_rationales}
          correctAnswers={answerResults[currentIndex]?.correct_answers}
          disabled={!!answerResults[currentIndex]}
        />

        <View style={styles.navigation}>
          <Pressable
            style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
            onPress={handlePrevious}
            disabled={currentIndex === 0}
          >
            <ArrowLeft color={currentIndex === 0 ? Colors.text.tertiary : Colors.primary} size={20} />
            <Text style={[styles.navButtonText, currentIndex === 0 && styles.navButtonTextDisabled]}>
              Previous
            </Text>
          </Pressable>

          {currentIndex === questions.length - 1 ? (
            <Pressable
              style={[styles.finishButton, !answers[currentIndex] && styles.finishButtonDisabled]}
              onPress={handleFinish}
              disabled={!answers[currentIndex]}
            >
              <CheckCircle color={Colors.text.light} size={20} />
              <Text style={styles.finishButtonText}>Finish</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.navButton, !answers[currentIndex] && styles.navButtonDisabled]}
              onPress={handleNext}
              disabled={!answers[currentIndex]}
            >
              <Text style={[styles.navButtonText, !answers[currentIndex] && styles.navButtonTextDisabled]}>
                Next
              </Text>
              <ArrowRight color={!answers[currentIndex] ? Colors.text.tertiary : Colors.primary} size={20} />
            </Pressable>
          )}
        </View>
      </ScrollView>
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
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  retryButtonText: {
    ...Typography.bodyBold,
    color: Colors.text.light,
  },
  backButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  backButtonText: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.border.light,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  stats: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  statsText: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  navButtonDisabled: {
    borderColor: Colors.border.light,
    opacity: 0.5,
  },
  navButtonText: {
    ...Typography.bodyBold,
    color: Colors.primary,
  },
  navButtonTextDisabled: {
    color: Colors.text.tertiary,
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    flex: 1,
    justifyContent: 'center',
  },
  finishButtonDisabled: {
    opacity: 0.5,
  },
  finishButtonText: {
    ...Typography.bodyBold,
    color: Colors.text.light,
  },
});
