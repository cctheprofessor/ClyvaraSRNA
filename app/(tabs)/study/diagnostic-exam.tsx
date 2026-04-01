import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { mlClient } from '@/lib/ml-backend-client';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import MLBackendConsentModal from '@/components/MLBackendConsentModal';
import QuestionRenderer from '@/components/study/QuestionRenderer';
import { CircleCheck as CheckCircle, CircleAlert as AlertCircle, Send, ArrowRight, RotateCcw, CirclePlay as PlayCircle } from 'lucide-react-native';
import { Question, AnswerFormat } from '@/types/question';
import { validateAnswer, ValidationResult } from '@/lib/answer-validator';
import { rationaleCacheService } from '@/lib/rationale-cache-service';
import { sessionPersistenceService, SessionState } from '@/lib/session-persistence-service';

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
  correct_pairs?: Record<string, string>;
}

const formatCorrectPairs = (question: Question, correctPairs: Record<string, string>): string[] => {
  if (question.question_type !== 'drag_drop_matching') {
    return [];
  }

  return Object.entries(correctPairs).map(([aId, bId]) => {
    const aItem = question.options.column_a.find(item => item.id === aId);
    const bItem = question.options.column_b.find(item => item.id === bId);
    if (!aItem || !bItem) return '';
    return `${aItem.text} → ${bItem.text}`;
  }).filter(Boolean);
};

export default function DiagnosticExamScreen() {
  const router = useRouter();
  const { profile, refreshProfile, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [answerResults, setAnswerResults] = useState<Record<number, AnswerResult>>({});
  const [currentAnswerSubmitted, setCurrentAnswerSubmitted] = useState(false);
  const [diagnosticAnswers, setDiagnosticAnswers] = useState<DiagnosticAnswer[]>([]);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [rationaleLoading, setRationaleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumeDialogVisible, setResumeDialogVisible] = useState(false);
  const [existingSession, setExistingSession] = useState<SessionState | null>(null);
  const [submittedQuestions, setSubmittedQuestions] = useState<number[]>([]);
  const [showMLConsentModal, setShowMLConsentModal] = useState(false);

  useEffect(() => {
    loadDiagnosticQuestions();
  }, []);

  const loadDiagnosticQuestions = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!profile?.ml_user_id) {
        if (!profile?.ml_backend_consent_given) {
          setShowMLConsentModal(true);
          setLoading(false);
        } else {
          await performMLSyncAndLoad();
        }
        return;
      }

      const savedSession = await sessionPersistenceService.getActiveSession('diagnostic');

      if (savedSession && savedSession.questions.length > 0) {
        if (__DEV__) { console.log('[DiagnosticExam] Found existing session, showing resume dialog'); }
        setExistingSession(savedSession);
        setResumeDialogVisible(true);
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
      setStartTime(Date.now());
      setQuestionStartTime(Date.now());
      setLoading(false);

      await saveSessionState(diagnosticQuestions, 0, {}, {}, []);
    } catch (err: any) {
      if (__DEV__) { console.error('[DiagnosticExam] Error loading questions:', err); }
      setError(err.message || 'Failed to load diagnostic exam. Please try again.');
      setLoading(false);
    }
  };

  const performMLSyncAndLoad = async () => {
    if (!user) return;
    try {
      const mlData = await mlClient.syncUser({ external_user_id: user.id });
      const mlUserId = typeof mlData.user_id === 'number' ? mlData.user_id : Number(mlData.user_id);
      if (!mlUserId || isNaN(mlUserId)) {
        throw new Error('ML backend did not return a valid user ID. Please try again.');
      }

      await supabase
        .from('profiles')
        .update({
          ml_user_id: mlUserId,
          ml_last_synced_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      await supabase.from('ml_sync_status').upsert(
        {
          user_id: user.id,
          sync_status: 'active',
          last_sync_at: new Date().toISOString(),
          last_sync_error: null,
        },
        { onConflict: 'user_id' }
      );

      await refreshProfile();

      const savedSession = await sessionPersistenceService.getActiveSession('diagnostic');
      if (savedSession && savedSession.questions.length > 0) {
        setExistingSession(savedSession);
        setResumeDialogVisible(true);
        setLoading(false);
        return;
      }

      const diagnosticQuestions = await mlClient.getDiagnosticQuestions(mlUserId);
      if (diagnosticQuestions.length === 0) {
        setError('No diagnostic questions available. Please try again later.');
        setLoading(false);
        return;
      }

      setQuestions(diagnosticQuestions);
      setStartTime(Date.now());
      setQuestionStartTime(Date.now());
      setLoading(false);
      await saveSessionState(diagnosticQuestions, 0, {}, {}, []);
    } catch (err: any) {
      if (__DEV__) { console.error('[DiagnosticExam] ML sync error:', err); }
      setError(err.message || 'Failed to connect to Clyvara Analytica. Please try again.');
      setLoading(false);
    }
  };

  const handleMLConsentAccept = async () => {
    setShowMLConsentModal(false);
    if (!user) return;
    setLoading(true);
    await supabase
      .from('profiles')
      .update({
        ml_backend_consent_given: true,
        ml_backend_consent_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    await refreshProfile();
    await performMLSyncAndLoad();
  };

  const handleMLConsentDecline = () => {
    setShowMLConsentModal(false);
    router.back();
  };

  const saveSessionState = async (
    questionsArray: Question[],
    index: number,
    answersMap: Record<number, string>,
    resultsMap: Record<number, AnswerResult>,
    submittedList: number[]
  ) => {
    try {
      const state: SessionState = {
        id: existingSession?.id || '',
        sessionType: 'diagnostic',
        questions: questionsArray,
        currentIndex: index,
        answers: answersMap,
        answerResults: resultsMap,
        submittedQuestions: submittedList,
        startTime: startTime,
        lastUpdated: Date.now(),
      };

      await sessionPersistenceService.saveSession(state);
    } catch (error) {
      if (__DEV__) { console.error('[DiagnosticExam] Failed to save session:', error); }
    }
  };

  const handleResumeSession = () => {
    if (!existingSession) return;

    if (__DEV__) { console.log('[DiagnosticExam] Resuming session from question', existingSession.currentIndex); }
    sessionPersistenceService.setCurrentSessionId(existingSession.id);
    setQuestions(existingSession.questions);
    setCurrentIndex(existingSession.currentIndex);
    setAnswers(existingSession.answers);
    setAnswerResults(existingSession.answerResults);
    setSubmittedQuestions(existingSession.submittedQuestions);
    setStartTime(existingSession.startTime);
    setQuestionStartTime(Date.now());

    const reconstructedAnswers: DiagnosticAnswer[] = existingSession.submittedQuestions.map(index => ({
      question_id: existingSession.questions[index].id,
      answer: existingSession.answers[index],
      response_time_ms: 0,
      is_correct: existingSession.answerResults[index]?.is_correct,
    }));
    setDiagnosticAnswers(reconstructedAnswers);

    const isCurrentQuestionSubmitted = existingSession.submittedQuestions.includes(existingSession.currentIndex);
    setCurrentAnswerSubmitted(isCurrentQuestionSubmitted);

    setResumeDialogVisible(false);
  };

  const handleStartNewSession = async () => {
    try {
      if (existingSession) {
        await sessionPersistenceService.deleteSession(existingSession.id);
      }

      setResumeDialogVisible(false);
      setExistingSession(null);
      setLoading(true);

      const diagnosticQuestions = await mlClient.getDiagnosticQuestions(profile!.ml_user_id!);

      if (diagnosticQuestions.length === 0) {
        setError('No diagnostic questions available. Please try again later.');
        setLoading(false);
        return;
      }

      setQuestions(diagnosticQuestions);
      setCurrentIndex(0);
      setAnswers({});
      setAnswerResults({});
      setSubmittedQuestions([]);
      setCurrentAnswerSubmitted(false);
      setDiagnosticAnswers([]);
      setStartTime(Date.now());
      setQuestionStartTime(Date.now());
      setLoading(false);

      await saveSessionState(diagnosticQuestions, 0, {}, {}, []);
    } catch (err: any) {
      if (__DEV__) { console.error('[DiagnosticExam] Error starting new session:', err); }
      setError(err.message || 'Failed to start new exam. Please try again.');
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
      if (__DEV__) { console.error('[DiagnosticExam] Failed to parse answer:', error); }
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
      if (__DEV__) { console.error('[DiagnosticExam] Failed to parse answer'); }
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

    const newSubmittedQuestions = [...submittedQuestions, currentIndex];
    setSubmittedQuestions(newSubmittedQuestions);

    try {
      const backendResult = await mlClient.submitDiagnosticAnswer({
        user_id: profile!.ml_user_id!,
        question_id: currentQuestion.id,
        answer: currentAnswer,
        response_time_ms: responseTime,
      });

      if (backendResult.success && backendResult.rationale) {
        if (__DEV__) {
        console.log('[DiagnosticExam] Backend result:', {
          is_correct: backendResult.is_correct,
          has_rationale: !!backendResult.rationale,
          has_option_rationales: !!backendResult.option_rationales,
          correct_answers: backendResult.correct_answers,
          validation_correct_answers: validationResult.correct_answers,
          validation_correct_pairs: validationResult.correct_pairs,
          question_type: currentQuestion.question_type,
        });
        }

        const correctAnswersForDisplay = backendResult.correct_answers ||
          validationResult.correct_answers ||
          (validationResult.correct_pairs && currentQuestion.question_type === 'drag_drop_matching'
            ? formatCorrectPairs(currentQuestion, validationResult.correct_pairs)
            : undefined);

        setAnswerResults(prev => ({
          ...prev,
          [currentIndex]: {
            is_correct: backendResult.is_correct ?? validationResult.is_correct,
            rationale: backendResult.rationale,
            option_rationales: backendResult.option_rationales,
            correct_answers: correctAnswersForDisplay,
            correct_pairs: validationResult.correct_pairs,
          },
        }));
        setRationaleLoading(false);

        await rationaleCacheService.setRationale(currentQuestion.id, {
          rationale: backendResult.rationale,
          option_rationales: backendResult.option_rationales,
          correct_answers: correctAnswersForDisplay,
        });
        return;
      }
    } catch (err) {
      if (__DEV__) { console.log('[DiagnosticExam] Backend submission failed, falling back to cache and local validation'); }
    }

    const cachedRationale = await rationaleCacheService.getRationale(currentQuestion.id);

    const correctAnswersForDisplay = validationResult.correct_answers ||
      (validationResult.correct_pairs && currentQuestion.question_type === 'drag_drop_matching'
        ? formatCorrectPairs(currentQuestion, validationResult.correct_pairs)
        : undefined);

    if (cachedRationale) {
      setAnswerResults(prev => ({
        ...prev,
        [currentIndex]: {
          is_correct: validationResult.is_correct,
          rationale: cachedRationale.rationale || validationResult.explanation || validationResult.rationale,
          option_rationales: cachedRationale.option_rationales,
          correct_answers: cachedRationale.correct_answers || correctAnswersForDisplay,
          correct_pairs: validationResult.correct_pairs,
        },
      }));
      setRationaleLoading(false);
    } else {
      setAnswerResults(prev => ({
        ...prev,
        [currentIndex]: {
          is_correct: validationResult.is_correct,
          rationale: validationResult.explanation || validationResult.rationale,
          correct_answers: correctAnswersForDisplay,
          correct_pairs: validationResult.correct_pairs,
        },
      }));
      setRationaleLoading(false);
    }

    await saveSessionState(questions, currentIndex, answers, answerResults, newSubmittedQuestions);
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setQuestionStartTime(Date.now());

      const isNextQuestionSubmitted = submittedQuestions.includes(nextIndex);
      setCurrentAnswerSubmitted(isNextQuestionSubmitted);

      await saveSessionState(questions, nextIndex, answers, answerResults, submittedQuestions);
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
        if (__DEV__) { console.error('[DiagnosticExam] Error updating profile:', updateError); }
        throw updateError;
      }

      try {
        await mlClient.completeDiagnosticExam(profile!.ml_user_id!);
      } catch (err) {
        if (__DEV__) { console.log('[DiagnosticExam] Backend completion failed, continuing with local data'); }
      }

      await sessionPersistenceService.completeSession();

      await refreshProfile();

      router.replace('/(tabs)/study/diagnostic-results');
    } catch (err: any) {
      if (__DEV__) { console.error('[DiagnosticExam] Error completing diagnostic:', err); }
      Alert.alert('Error', 'Failed to complete diagnostic. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading || resumeDialogVisible) {
    return (
      <View style={styles.container}>
        <PageHeader title="Diagnostic Assessment" subtitle="Loading your exam" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your diagnostic exam...</Text>
        </View>

        <Modal
          visible={resumeDialogVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setResumeDialogVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Resume Diagnostic Exam?</Text>
              <Text style={styles.modalMessage}>
                You have an exam in progress with {existingSession ? existingSession.submittedQuestions.length : 0} of{' '}
                {existingSession ? existingSession.questions.length : 0} questions completed.
              </Text>
              <Text style={styles.modalSubMessage}>
                Would you like to continue from where you left off or start a new exam?
              </Text>

              <View style={styles.modalButtons}>
                <Pressable style={styles.modalButtonSecondary} onPress={handleStartNewSession}>
                  <RotateCcw size={20} color={Colors.text.primary} />
                  <Text style={styles.modalButtonSecondaryText}>Start New</Text>
                </Pressable>

                <Pressable style={styles.modalButtonPrimary} onPress={handleResumeSession}>
                  <PlayCircle size={20} color={Colors.white} />
                  <Text style={styles.modalButtonPrimaryText}>Resume</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
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

  if (questions.length === 0 || currentIndex >= questions.length) {
    return (
      <View style={styles.container}>
        <PageHeader title="Diagnostic Assessment" subtitle="Loading exam" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading exam...</Text>
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

      <MLBackendConsentModal
        visible={showMLConsentModal}
        onAccept={handleMLConsentAccept}
        onDecline={handleMLConsentDecline}
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
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    gap: Spacing.md,
  },
  modalTitle: {
    fontSize: Typography.h2.fontSize,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: Typography.body.fontSize,
    color: Colors.text.primary,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalSubMessage: {
    fontSize: Typography.small.fontSize,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  modalButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  modalButtonPrimaryText: {
    color: Colors.white,
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
  },
  modalButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.medium,
  },
  modalButtonSecondaryText: {
    color: Colors.text.primary,
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
  },
});
