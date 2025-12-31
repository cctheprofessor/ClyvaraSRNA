import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { mlClient } from '@/lib/ml-backend-client';
import { offlinePracticeManager } from '@/lib/offline-practice-manager';
import { questionSessionTracker } from '@/lib/question-session-tracker';
import { sessionPersistenceService } from '@/lib/session-persistence-service';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import QuestionRenderer from '@/components/study/QuestionRenderer';
import SessionResults from '@/components/study/SessionResults';
import DiagnosticRequiredModal from '@/components/study/DiagnosticRequiredModal';
import { ArrowLeft, ArrowRight, CheckCircle, Send, RotateCcw } from 'lucide-react-native';
import { Question, AnswerFormat } from '@/types/question';
import { filterValidQuestions } from '@/lib/question-validator';
import { validateAnswer } from '@/lib/answer-validator';
import { rationaleCacheService } from '@/lib/rationale-cache-service';
import { isDiagnosticRequiredError } from '@/types/errors';

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
  const [currentAnswerSubmitted, setCurrentAnswerSubmitted] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [showResults, setShowResults] = useState(false);
  const [sessionResults, setSessionResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingSubmissions, setPendingSubmissions] = useState<Set<number>>(new Set());
  const [explanationLoading, setExplanationLoading] = useState<Record<number, boolean>>({});
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);

  useEffect(() => {
    if (profile && !profile.diagnostic_completed) {
      router.replace('/(tabs)/study/diagnostic-exam');
      return;
    }
    checkForSavedSession();
    return () => {
      sessionPersistenceService.flushPendingSave();
      if (profile?.ml_user_id) {
        questionSessionTracker.endSession(profile.ml_user_id);
      }
    };
  }, [profile]);

  useEffect(() => {
    if (!showResumeModal && questions.length > 0 && !showResults) {
      saveSessionState();
    }
  }, [currentIndex, answers, answerResults, questions]);

  const checkForSavedSession = async () => {
    try {
      console.log('[Practice25] Checking for saved session...');
      const savedSession = await sessionPersistenceService.getActiveSession('25');
      if (savedSession) {
        const progress = sessionPersistenceService.getProgressSummary(savedSession);
        console.log('[Practice25] Found saved session:', {
          id: savedSession.id,
          progress: `${progress.completed}/${progress.total}`,
        });
        if (progress.completed > 0 && progress.completed < progress.total) {
          setSavedSessionId(savedSession.id);
          setShowResumeModal(true);
          setLoading(false);
        } else {
          console.log('[Practice25] Session is empty or complete, starting new');
          loadQuestions();
        }
      } else {
        console.log('[Practice25] No saved session found, starting new');
        loadQuestions();
      }
    } catch (error) {
      console.error('[Practice25] Failed to check for saved session:', error);
      loadQuestions();
    }
  };

  const handleResumeSession = async () => {
    try {
      const savedSession = await sessionPersistenceService.getActiveSession('25');
      if (!savedSession) {
        setShowResumeModal(false);
        loadQuestions();
        return;
      }

      sessionPersistenceService.setCurrentSessionId(savedSession.id);
      setQuestions(savedSession.questions);
      setCurrentIndex(savedSession.currentIndex);
      setAnswers(savedSession.answers);
      setAnswerResults(savedSession.answerResults);
      setStartTime(savedSession.startTime);
      setCurrentAnswerSubmitted(savedSession.submittedQuestions.includes(savedSession.currentIndex));
      setQuestionStartTime(Date.now());
      setShowResumeModal(false);
      setLoading(false);

      if (profile?.ml_user_id) {
        await questionSessionTracker.startNewSession(profile.ml_user_id);
      }
    } catch (error) {
      console.error('[Practice25] Failed to resume session:', error);
      setShowResumeModal(false);
      loadQuestions();
    }
  };

  const handleStartNewSession = async () => {
    if (savedSessionId) {
      await sessionPersistenceService.deleteSession(savedSessionId);
    }
    sessionPersistenceService.clearCurrentSessionId();
    setShowResumeModal(false);
    loadQuestions();
  };

  const saveSessionState = async () => {
    if (questions.length === 0 || showResults) return;

    try {
      const submittedQuestions = Object.keys(answerResults).map(k => parseInt(k, 10));

      console.log('[Practice25] Saving session state:', {
        currentIndex,
        answersCount: Object.keys(answers).length,
        submittedCount: submittedQuestions.length,
      });

      await sessionPersistenceService.saveSession({
        id: savedSessionId || '',
        sessionType: '25',
        questions,
        currentIndex,
        answers,
        answerResults,
        submittedQuestions,
        startTime,
        lastUpdated: Date.now(),
      });
    } catch (error) {
      console.error('[Practice25] Failed to save session state:', error);
    }
  };

  const loadQuestions = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!profile?.ml_user_id) {
        setError('Your account is not synced with the ML backend. Please contact support or visit /admin/sync-user if you have admin access.');
        setLoading(false);
        return;
      }

      let cachedQuestions = await offlinePracticeManager.getRandomCachedQuestions(profile.ml_user_id, 25);

      const { validQuestions: validCachedQuestions, rejectedQuestions: rejectedCachedQuestions } = filterValidQuestions(cachedQuestions);

      if (rejectedCachedQuestions.length > 0) {
        console.warn(`[Practice25] Filtered ${rejectedCachedQuestions.length} invalid cached questions`);
      }

      cachedQuestions = validCachedQuestions;

      await questionSessionTracker.startNewSession(profile.ml_user_id);

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
        let fetchedQuestions = await mlClient.getNextQuestions(profile.ml_user_id, 25);

        const { validQuestions, rejectedQuestions } = filterValidQuestions(fetchedQuestions);

        if (rejectedQuestions.length > 0) {
          console.warn(`[Practice25] Filtered ${rejectedQuestions.length} invalid API questions`);
        }

        if (validQuestions.length === 0) {
          throw new Error('No valid questions received. Please try again later.');
        }

        setQuestions(validQuestions);
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
      if (isDiagnosticRequiredError(err)) {
        setShowDiagnosticModal(true);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load questions');
      }
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
      console.error('[Practice25] Failed to parse answer:', error);
      return null;
    }
  };

  const handleAnswerChange = (serializedAnswer: string) => {
    setAnswers({ ...answers, [currentIndex]: serializedAnswer });
  };

  const handleSubmitAnswer = () => {
    submitCurrentAnswer();
    setCurrentAnswerSubmitted(true);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setQuestionStartTime(Date.now());
      setCurrentAnswerSubmitted(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setQuestionStartTime(Date.now());
      setCurrentAnswerSubmitted(!!answerResults[currentIndex - 1]);
    }
  };

  const submitCurrentAnswer = () => {
    const questionIndex = currentIndex;
    const currentQuestion = questions[questionIndex];
    const serializedAnswer = answers[questionIndex];

    if (!serializedAnswer || !profile?.ml_user_id) {
      console.warn('[Practice25] Cannot submit: missing answer or ml_user_id', {
        hasAnswer: !!serializedAnswer,
        hasMlUserId: !!profile?.ml_user_id,
        mlUserId: profile?.ml_user_id,
      });
      return;
    }

    const studentId = profile.ml_user_id;
    const responseTime = Math.floor((Date.now() - questionStartTime) / 1000);

    const parsedAnswer = parseAnswer(currentQuestion, serializedAnswer);
    if (!parsedAnswer) {
      console.error('[Practice25] Failed to parse answer');
      return;
    }

    const validationResult = validateAnswer(currentQuestion, parsedAnswer);

    questionSessionTracker.markQuestionAnswered(studentId, currentQuestion.id, validationResult.is_correct);

    setPendingSubmissions(prev => new Set(prev).add(questionIndex));
    setExplanationLoading(prev => ({ ...prev, [questionIndex]: true }));

    (async () => {
      const cachedRationale = await rationaleCacheService.getRationale(currentQuestion.id);

      if (cachedRationale) {
        setAnswerResults(prev => ({
          ...prev,
          [questionIndex]: {
            is_correct: validationResult.is_correct,
            response_time: responseTime,
            rationale: cachedRationale.rationale || validationResult.explanation || validationResult.rationale,
            option_rationales: cachedRationale.option_rationales,
            correct_answers: cachedRationale.correct_answers || validationResult.correct_answers,
          },
        }));
        setExplanationLoading(prev => ({ ...prev, [questionIndex]: false }));
      }

      try {
        const result = await mlClient.submitAnswer({
          student_id: studentId,
          question_id: currentQuestion.id,
          student_answer: serializedAnswer,
          response_time_seconds: responseTime,
        });

        console.log('[Practice25] Submit answer result:', result);

        setAnswerResults(prev => ({
          ...prev,
          [questionIndex]: {
            is_correct: result.is_correct,
            response_time: responseTime,
            rationale: result.rationale || validationResult.explanation || validationResult.rationale,
            option_rationales: result.option_rationales,
            correct_answers: result.correct_answers || validationResult.correct_answers,
          },
        }));
        setExplanationLoading(prev => ({ ...prev, [questionIndex]: false }));

        await rationaleCacheService.setRationale(currentQuestion.id, {
          rationale: result.rationale,
          option_rationales: result.option_rationales,
          correct_answers: result.correct_answers,
        });
      } catch (error) {
        console.warn('[Practice25] API submission failed', error);
        await offlinePracticeManager.queueResponse({
          student_id: studentId,
          question_id: currentQuestion.id,
          student_answer: serializedAnswer,
          response_time_seconds: responseTime,
          answered_at: new Date().toISOString(),
        });

        if (!cachedRationale) {
          setAnswerResults(prev => ({
            ...prev,
            [questionIndex]: {
              is_correct: validationResult.is_correct,
              response_time: responseTime,
              rationale: validationResult.explanation || validationResult.rationale,
              correct_answers: validationResult.correct_answers,
            },
          }));
        }
        setExplanationLoading(prev => ({ ...prev, [questionIndex]: false }));
      } finally {
        setPendingSubmissions(prev => {
          const newSet = new Set(prev);
          newSet.delete(questionIndex);
          return newSet;
        });
      }
    })();
  };

  const handleSubmitAndFinish = () => {
    submitCurrentAnswer();
    setCurrentAnswerSubmitted(true);
  };

  const handleFinish = async () => {
    const maxWaitTime = 10000;
    const startWait = Date.now();

    while (pendingSubmissions.size > 0 && (Date.now() - startWait) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const totalTime = Math.floor((Date.now() - startTime) / 1000);

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

    if (profile?.ml_user_id) {
      offlinePracticeManager.refreshCacheAfterSession(profile.ml_user_id, 50).catch(error => {
        console.warn('[Practice25] Failed to refresh cache:', error);
      });

      await questionSessionTracker.endSession(profile.ml_user_id);
    }

    await sessionPersistenceService.completeSession(savedSessionId || undefined);
    sessionPersistenceService.clearCurrentSessionId();

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

  if (showResumeModal) {
    return (
      <View style={styles.container}>
        <Modal
          visible={showResumeModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowResumeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <RotateCcw size={48} color={Colors.primary} style={styles.modalIcon} />
              <Text style={styles.modalTitle}>Continue Previous Session?</Text>
              <Text style={styles.modalSubtitle}>
                You have an unfinished practice session. Would you like to continue where you left off?
              </Text>
              <View style={styles.modalButtons}>
                <Pressable
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={handleResumeSession}
                >
                  <Text style={styles.modalButtonTextPrimary}>Resume Session</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalButton, styles.modalButtonSecondary]}
                  onPress={handleStartNewSession}
                >
                  <Text style={styles.modalButtonTextSecondary}>Start New</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
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
          rationaleLoading={explanationLoading[currentIndex]}
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

          {!currentAnswerSubmitted ? (
            <Pressable
              style={[styles.submitButton, !answers[currentIndex] && styles.submitButtonDisabled]}
              onPress={currentIndex === questions.length - 1 ? handleSubmitAndFinish : handleSubmitAnswer}
              disabled={!answers[currentIndex]}
            >
              <Send color={Colors.text.light} size={20} />
              <Text style={styles.submitButtonText}>Submit Answer</Text>
            </Pressable>
          ) : currentIndex === questions.length - 1 ? (
            <Pressable
              style={[
                styles.finishButton,
                explanationLoading[currentIndex] && styles.finishButtonDisabled,
              ]}
              onPress={handleFinish}
              disabled={explanationLoading[currentIndex]}
            >
              <CheckCircle color={Colors.text.light} size={20} />
              <Text style={styles.finishButtonText}>Finish Session</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[
                styles.navButton,
                explanationLoading[currentIndex] && styles.navButtonDisabled,
              ]}
              onPress={handleNext}
              disabled={explanationLoading[currentIndex]}
            >
              <Text style={[
                styles.navButtonText,
                explanationLoading[currentIndex] && styles.navButtonTextDisabled,
              ]}>
                Next Question
              </Text>
              <ArrowRight
                color={explanationLoading[currentIndex] ? Colors.text.tertiary : Colors.primary}
                size={20}
              />
            </Pressable>
          )}
        </View>
      </ScrollView>

      <DiagnosticRequiredModal
        visible={showDiagnosticModal}
        onClose={() => {
          setShowDiagnosticModal(false);
          router.back();
        }}
        onStartDiagnostic={() => {
          setShowDiagnosticModal(false);
          router.push('/(tabs)/study/diagnostic-exam');
        }}
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
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    flex: 1,
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    ...Typography.bodyBold,
    color: Colors.text.light,
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
  finishButtonText: {
    ...Typography.bodyBold,
    color: Colors.text.light,
  },
  finishButtonDisabled: {
    opacity: 0.4,
    backgroundColor: Colors.border.light,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    gap: Spacing.md,
  },
  modalIcon: {
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  modalSubtitle: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  modalButtons: {
    width: '100%',
    gap: Spacing.sm,
  },
  modalButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: Colors.primary,
  },
  modalButtonSecondary: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border.medium,
  },
  modalButtonTextPrimary: {
    ...Typography.bodyBold,
    color: Colors.text.light,
  },
  modalButtonTextSecondary: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
  },
});
