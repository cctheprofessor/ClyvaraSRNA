import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import QuestionRenderer from '@/components/study/QuestionRenderer';
import SessionResults from '@/components/study/SessionResults';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Question, deserializeAnswer, AnswerFormat } from '@/types/question';
import { mlClient } from '@/lib/ml-backend-client';
import { validateAnswer } from '@/lib/answer-validator';
import { ArrowRight, CheckCircle } from 'lucide-react-native';

interface SessionAnswer {
  question_id: string;
  is_correct: boolean;
  time_spent_seconds: number;
  answer_data: any;
}

interface AnswerResult {
  is_correct: boolean;
  response_time: number;
  rationale?: string;
  option_rationales?: Record<string, string>;
  correct_answers?: string[];
}

export default function PracticeSessionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const sessionId = params.sessionId as string;
  const topicId = parseInt(params.topicId as string);
  const topicName = params.topicName as string;

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<SessionAnswer[]>([]);
  const [answerResults, setAnswerResults] = useState<Record<number, AnswerResult>>({});
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [showResults, setShowResults] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null);
  const [currentAnswerSubmitted, setCurrentAnswerSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mlUserId, setMlUserId] = useState<number | null>(null);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  useEffect(() => {
    setCurrentAnswer(null);
    setCurrentAnswerSubmitted(!!answerResults[currentIndex]);
  }, [currentIndex]);

  const loadSession = async () => {
    try {
      setLoading(true);

      // Get session details
      const { data: session, error: sessionError } = await supabase
        .from('focused_topic_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      // Check if already completed
      if (session.is_completed) {
        setShowResults(true);
        setLoading(false);
        return;
      }

      // Get ML user ID from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('ml_user_id')
        .eq('id', user?.id)
        .maybeSingle();

      if (profileError || !profile?.ml_user_id) {
        throw new Error('User not synced with ML backend. Please sync your account first.');
      }

      // Get questions from ML backend
      const questionsData = await mlClient.getNextQuestions(
        profile.ml_user_id,
        session.questions_count,
        String(topicId)
      );

      setQuestions(questionsData);
      setCurrentIndex(session.current_question_index);
      setStartTime(new Date());
      setMlUserId(profile.ml_user_id);
    } catch (error) {
      console.error('Error loading session:', error);
      Alert.alert('Error', 'Failed to load practice session');
      router.back();
    } finally {
      setLoading(false);
    }
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
      console.error('[PracticeSession] Failed to parse answer:', error);
      return null;
    }
  };

  const handleAnswerChange = (serializedAnswer: string) => {
    setCurrentAnswer(serializedAnswer);
  };

  const handleSubmit = async () => {
    if (!currentAnswer || !mlUserId) return;

    setSubmitting(true);
    try {
      const currentQuestion = questions[currentIndex];
      const timeSpent = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);

      const parsedAnswer = parseAnswer(currentQuestion, currentAnswer);
      if (!parsedAnswer) {
        Alert.alert('Error', 'Invalid answer format');
        setSubmitting(false);
        return;
      }

      const validationResult = validateAnswer(currentQuestion, parsedAnswer);

      try {
        const result = await mlClient.submitAnswer({
          student_id: mlUserId,
          question_id: currentQuestion.id,
          student_answer: currentAnswer,
          response_time_seconds: timeSpent,
        });

        setAnswerResults(prev => ({
          ...prev,
          [currentIndex]: {
            is_correct: result.is_correct,
            response_time: timeSpent,
            rationale: result.rationale || validationResult.explanation || validationResult.rationale,
            option_rationales: result.option_rationales,
            correct_answers: result.correct_answers || validationResult.correct_answers,
          },
        }));
      } catch (error) {
        console.warn('[PracticeSession] API submission failed, using cached validation', error);
        setAnswerResults(prev => ({
          ...prev,
          [currentIndex]: {
            is_correct: validationResult.is_correct,
            response_time: timeSpent,
            rationale: validationResult.explanation || validationResult.rationale,
            correct_answers: validationResult.correct_answers,
          },
        }));
      }

      const newAnswer: SessionAnswer = {
        question_id: currentQuestion.id,
        is_correct: validationResult.is_correct,
        time_spent_seconds: timeSpent,
        answer_data: currentAnswer,
      };

      const updatedAnswers = [...answers, newAnswer];
      setAnswers(updatedAnswers);

      await supabase
        .from('focused_topic_sessions')
        .update({
          current_question_index: currentIndex + 1,
          answers_data: updatedAnswers,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      setCurrentAnswerSubmitted(true);
    } catch (error) {
      console.error('Error submitting answer:', error);
      Alert.alert('Error', 'Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (currentIndex + 1 >= questions.length) {
      await completeSession(answers);
    } else {
      setCurrentIndex(currentIndex + 1);
      setStartTime(new Date());
    }
  };

  const completeSession = async (finalAnswers: SessionAnswer[]) => {
    try {
      const correctCount = finalAnswers.filter((a) => a.is_correct).length;
      const totalTime = finalAnswers.reduce((sum, a) => sum + a.time_spent_seconds, 0);

      const { error } = await supabase
        .from('focused_topic_sessions')
        .update({
          is_completed: true,
          correct_answers: correctCount,
          total_time_seconds: totalTime,
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) throw error;

      setShowResults(true);
    } catch (error) {
      console.error('Error completing session:', error);
      Alert.alert('Error', 'Failed to save session results');
    }
  };

  const handleReturnToDashboard = () => {
    router.push('/(tabs)/study/focused-topic');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <PageHeader title={topicName} subtitle="Loading questions..." />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  if (showResults) {
    const correctCount = answers.filter((a) => a.is_correct).length;
    const totalTime = answers.reduce((sum, a) => sum + a.time_spent_seconds, 0);
    return (
      <View style={styles.container}>
        <SessionResults
          totalQuestions={questions.length}
          correctAnswers={correctCount}
          totalTime={totalTime}
          onContinue={handleReturnToDashboard}
        />
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={styles.container}>
        <PageHeader title={topicName} subtitle="No questions available" />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No questions available for this topic yet.
          </Text>
        </View>
      </View>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <View style={styles.container}>
      <PageHeader
        title={topicName}
        subtitle={`Question ${currentIndex + 1} of ${questions.length}`}
      />
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
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
          {!currentAnswerSubmitted ? (
            <Pressable
              style={[
                styles.submitButton,
                (!currentAnswer || submitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!currentAnswer || submitting}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? 'Submitting...' : 'Submit Answer'}
              </Text>
            </Pressable>
          ) : currentIndex === questions.length - 1 ? (
            <Pressable
              style={styles.finishButton}
              onPress={handleNext}
            >
              <CheckCircle color={Colors.text.light} size={20} />
              <Text style={styles.finishButtonText}>Finish Session</Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.nextButton}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>Next Question</Text>
              <ArrowRight color={Colors.primary} size={20} />
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  navigation: {
    marginTop: Spacing.md,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: Colors.border.light,
    opacity: 0.5,
  },
  submitButtonText: {
    ...Typography.button,
    color: Colors.background,
    fontWeight: '600',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.background,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  nextButtonText: {
    ...Typography.button,
    color: Colors.primary,
    fontWeight: '600',
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.success,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  finishButtonText: {
    ...Typography.button,
    color: Colors.text.light,
    fontWeight: '600',
  },
});
