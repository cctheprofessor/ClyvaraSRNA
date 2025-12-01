import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { Plus, MessageCircle, Send } from 'lucide-react-native';

interface Question {
  id: string;
  question_text: string;
  created_at: string;
  responses?: Response[];
  responseCount?: number;
}

interface Response {
  id: string;
  question_id: string;
  response_text: string;
  created_at: string;
}

export default function AskAnonymouslyScreen() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAskModal, setShowAskModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      setLoading(true);

      const { data: questionsData, error } = await supabase
        .from('anonymous_questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const questionsWithCounts = await Promise.all(
        (questionsData || []).map(async (q) => {
          const { count } = await supabase
            .from('anonymous_responses')
            .select('*', { count: 'exact', head: true })
            .eq('question_id', q.id);

          return { ...q, responseCount: count || 0 };
        })
      );

      setQuestions(questionsWithCounts);
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!questionText.trim() || !user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('anonymous_questions')
        .insert({
          question_text: questionText.trim(),
          created_by: null,
        });

      if (!error) {
        setShowAskModal(false);
        setQuestionText('');
        await loadQuestions();
      }
    } catch (error) {
      console.error('Error posting question:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostResponse = async () => {
    if (!responseText.trim() || !selectedQuestion || !user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('anonymous_responses')
        .insert({
          question_id: selectedQuestion.id,
          response_text: responseText.trim(),
          created_by: null,
        });

      if (!error) {
        setShowResponseModal(false);
        setResponseText('');
        setSelectedQuestion(null);
        await loadQuestions();
      }
    } catch (error) {
      console.error('Error posting response:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewResponses = async (question: Question) => {
    const { data: responses } = await supabase
      .from('anonymous_responses')
      .select('*')
      .eq('question_id', question.id)
      .order('created_at', { ascending: false });

    setSelectedQuestion({ ...question, responses: responses || [] });
    setShowResponseModal(true);
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title="Ask Anonymously!"
        subtitle="Questions for the Clyvara Community"
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            loadQuestions();
          }} />
        }
      >
        <Pressable
          style={styles.askButton}
          onPress={() => setShowAskModal(true)}
        >
          <Plus color={Colors.text.light} size={20} />
          <Text style={styles.askButtonText}>Ask a Question</Text>
        </Pressable>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : questions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No questions yet. Be the first to ask!
            </Text>
          </View>
        ) : (
          questions.map((question) => (
            <View key={question.id} style={styles.questionCard}>
              <Text style={styles.questionText}>{question.question_text}</Text>
              <View style={styles.questionFooter}>
                <Text style={styles.questionDate}>
                  {new Date(question.created_at).toLocaleDateString()}
                </Text>
                <Pressable
                  style={styles.responseButton}
                  onPress={() => handleViewResponses(question)}
                >
                  <MessageCircle color={Colors.primary} size={16} />
                  <Text style={styles.responseCount}>
                    {question.responseCount || 0} {question.responseCount === 1 ? 'response' : 'responses'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showAskModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ask a Question</Text>
              <Pressable onPress={() => setShowAskModal(false)}>
                <Text style={styles.modalClose}>Cancel</Text>
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.helperText}>
                Your question will be posted anonymously
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="What would you like to ask the community?"
                value={questionText}
                onChangeText={setQuestionText}
                multiline
                numberOfLines={6}
                maxLength={1000}
              />
              <Text style={styles.charCount}>
                {questionText.length}/1000
              </Text>
              <Pressable
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleAskQuestion}
                disabled={submitting}
              >
                <Send color={Colors.text.light} size={18} />
                <Text style={styles.submitButtonText}>
                  {submitting ? 'Posting...' : 'Post Question'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showResponseModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Responses</Text>
              <Pressable onPress={() => {
                setShowResponseModal(false);
                setSelectedQuestion(null);
              }}>
                <Text style={styles.modalClose}>Close</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody}>
              {selectedQuestion && (
                <>
                  <View style={styles.originalQuestion}>
                    <Text style={styles.originalQuestionLabel}>Question:</Text>
                    <Text style={styles.originalQuestionText}>
                      {selectedQuestion.question_text}
                    </Text>
                  </View>

                  <View style={styles.responseInputSection}>
                    <TextInput
                      style={[styles.input, styles.responseInput]}
                      placeholder="Write your response..."
                      value={responseText}
                      onChangeText={setResponseText}
                      multiline
                      numberOfLines={3}
                    />
                    <Pressable
                      style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                      onPress={handlePostResponse}
                      disabled={submitting}
                    >
                      <Send color={Colors.text.light} size={18} />
                      <Text style={styles.submitButtonText}>
                        {submitting ? 'Posting...' : 'Post Response'}
                      </Text>
                    </Pressable>
                  </View>

                  <Text style={styles.responsesTitle}>
                    {selectedQuestion.responses?.length || 0} Responses
                  </Text>

                  {selectedQuestion.responses?.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyText}>
                        No responses yet. Be the first to respond!
                      </Text>
                    </View>
                  ) : (
                    selectedQuestion.responses?.map((response) => (
                      <View key={response.id} style={styles.responseCard}>
                        <Text style={styles.responseText}>
                          {response.response_text}
                        </Text>
                        <Text style={styles.responseDate}>
                          {new Date(response.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                    ))
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    gap: Spacing.md,
  },
  askButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  askButtonText: {
    color: Colors.text.light,
    fontWeight: '600',
    fontSize: 16,
  },
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyState: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  questionCard: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  questionText: {
    fontSize: 15,
    color: Colors.text.primary,
    lineHeight: 22,
  },
  questionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questionDate: {
    fontSize: 12,
    color: Colors.text.tertiary,
  },
  responseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  responseCount: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  modalClose: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  modalBody: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  helperText: {
    fontSize: 13,
    color: Colors.text.tertiary,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border.dark,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: 16,
    backgroundColor: Colors.background,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  responseInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: Colors.text.tertiary,
    textAlign: 'right',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.text.light,
    fontWeight: '600',
    fontSize: 16,
  },
  originalQuestion: {
    backgroundColor: Colors.backgroundSecondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  originalQuestionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
  },
  originalQuestionText: {
    fontSize: 15,
    color: Colors.text.primary,
    lineHeight: 22,
  },
  responseInputSection: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  responsesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  responseCard: {
    backgroundColor: Colors.backgroundSecondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
  },
  responseText: {
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  responseDate: {
    fontSize: 11,
    color: Colors.text.tertiary,
  },
});
