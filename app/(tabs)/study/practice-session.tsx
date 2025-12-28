import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, Spacing } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import QuestionRenderer from '@/components/study/QuestionRenderer';
import SessionResults from '@/components/study/SessionResults';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Question } from '@/types/question';
import { mlBackendClient } from '@/lib/ml-backend-client';

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

  useEffect(() => {
    loadSession();
  }, [sessionId]);

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

      // Get questions from ML backend
      const questionsData = await mlBackendClient.getTopicQuestions(
        topicId,
        session.questions_count
      );

      setQuestions(questionsData);
      setCurrentIndex(session.current_question_index);
      setStartTime(new Date());
    } catch (error) {
      console.error('Error loading session:', error);
      Alert.alert('Error', 'Failed to load practice session');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (
    questionId: string,
    isCorrect: boolean,
    answerData: any
  ) => {
    const timeSpent = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);

    const newAnswer: SessionAnswer = {
      question_id: questionId,
      is_correct: isCorrect,
      time_spent_seconds: timeSpent,
      answer_data: answerData,
    };

    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);

    // Update session in database
    try {
      const { error } = await supabase
        .from('focused_topic_sessions')
        .update({
          current_question_index: currentIndex + 1,
          answers_data: updatedAnswers,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving answer:', error);
    }

    // Move to next question or show results
    if (currentIndex + 1 >= questions.length) {
      await completeSession(updatedAnswers);
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
    return (
      <View style={styles.container}>
        <SessionResults
          totalQuestions={questions.length}
          correctAnswers={correctCount}
          onReturnToDashboard={handleReturnToDashboard}
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
      <QuestionRenderer
        question={currentQuestion}
        questionNumber={currentIndex + 1}
        totalQuestions={questions.length}
        onAnswer={handleAnswer}
      />
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
});
