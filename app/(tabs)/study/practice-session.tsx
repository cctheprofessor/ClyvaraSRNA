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
import { Question, deserializeAnswer } from '@/types/question';
import { mlClient } from '@/lib/ml-backend-client';

interface SessionAnswer {
  question_id: string;
  is_correct: boolean;
  time_spent_seconds: number;
  answer_data: any;
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
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [showResults, setShowResults] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mlUserId, setMlUserId] = useState<number | null>(null);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  useEffect(() => {
    setCurrentAnswer(null);
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

  const handleAnswerChange = (serializedAnswer: string) => {
    setCurrentAnswer(serializedAnswer);
  };

  const handleSubmit = async () => {
    if (!currentAnswer || !mlUserId) return;

    setSubmitting(true);
    try {
      const currentQuestion = questions[currentIndex];
      const timeSpent = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);

      // Submit answer to ML backend
      const result = await mlClient.submitAnswer({
        student_id: mlUserId,
        question_id: currentQuestion.id,
        student_answer: currentAnswer,
        response_time_seconds: timeSpent,
      });

      const newAnswer: SessionAnswer = {
        question_id: currentQuestion.id,
        is_correct: result.is_correct,
        time_spent_seconds: timeSpent,
        answer_data: currentAnswer,
      };

      const updatedAnswers = [...answers, newAnswer];
      setAnswers(updatedAnswers);

      // Update session in database
      await supabase
        .from('focused_topic_sessions')
        .update({
          current_question_index: currentIndex + 1,
          answers_data: updatedAnswers,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      // Move to next question or show results
      if (currentIndex + 1 >= questions.length) {
        await completeSession(updatedAnswers);
      } else {
        setCurrentIndex(currentIndex + 1);
        setStartTime(new Date());
        setCurrentAnswer(null);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      Alert.alert('Error', 'Failed to submit answer');
    } finally {
      setSubmitting(false);
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
          disabled={submitting}
        />
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
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
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
});
