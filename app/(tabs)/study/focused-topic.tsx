import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { Play, ChevronDown, BookOpen, Clock } from 'lucide-react-native';
import {
  getTopicHierarchy,
  getTopicById,
  hasChildren,
  type NCETopic,
} from '@/lib/topic-utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface FocusedTopicSession {
  id: string;
  topic_id: number;
  topic_name: string;
  topic_path: string;
  questions_count: number;
  current_question_index: number;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export default function FocusedTopicScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [selectedTopics, setSelectedTopics] = useState<(number | null)[]>([null]);
  const [topicHierarchy, setTopicHierarchy] = useState<NCETopic[][]>([]);
  const [activeSessions, setActiveSessions] = useState<FocusedTopicSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    if (profile && !profile.diagnostic_completed) {
      router.replace('/(tabs)/study/diagnostic-exam');
      return;
    }
    const hierarchy = getTopicHierarchy(selectedTopics);
    setTopicHierarchy(hierarchy);
  }, [selectedTopics, profile]);

  useEffect(() => {
    if (user) {
      loadActiveSessions();
    }
  }, [user]);

  const loadActiveSessions = async () => {
    try {
      setLoadingSessions(true);
      const { data, error } = await supabase
        .from('focused_topic_sessions')
        .select('*')
        .eq('is_completed', false)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setActiveSessions(data || []);
    } catch (error) {
      if (__DEV__) { console.error('Error loading sessions:', error); }
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleTopicSelect = (level: number, topicId: number) => {
    const newSelected = [...selectedTopics];
    newSelected[level] = topicId;
    newSelected.splice(level + 1);
    setSelectedTopics(newSelected);
  };

  const getSelectedTopic = (): NCETopic | null => {
    const lastSelectedId = selectedTopics.filter((id) => id !== null).pop();
    return lastSelectedId ? getTopicById(lastSelectedId) || null : null;
  };

  const canStartSession = (): boolean => {
    const selectedTopic = getSelectedTopic();
    return selectedTopic !== null && !hasChildren(selectedTopic.id);
  };

  const handleStartSession = async () => {
    const selectedTopic = getSelectedTopic();
    if (!selectedTopic || !user) return;

    try {
      setLoading(true);

      const { data: existingSession, error: checkError } = await supabase
        .from('focused_topic_sessions')
        .select('*')
        .eq('topic_id', selectedTopic.id)
        .eq('is_completed', false)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingSession) {
        Alert.alert(
          'Resume Session',
          'You have an active session for this topic. Would you like to resume it?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Resume',
              onPress: () => resumeSession(existingSession.id),
            },
          ]
        );
        return;
      }

      const { data: newSession, error: createError } = await supabase
        .from('focused_topic_sessions')
        .insert({
          user_id: user.id,
          topic_id: selectedTopic.id,
          topic_name: selectedTopic.name,
          topic_path: selectedTopic.full_path,
          questions_count: 10,
        })
        .select()
        .single();

      if (createError) throw createError;

      router.push({
        pathname: '/study/practice-session',
        params: {
          sessionId: newSession.id,
          topicId: selectedTopic.id,
          topicName: selectedTopic.name,
        },
      });
    } catch (error) {
      if (__DEV__) { console.error('Error starting session:', error); }
      Alert.alert('Error', 'Failed to start practice session');
    } finally {
      setLoading(false);
    }
  };

  const resumeSession = async (sessionId: string) => {
    const session = activeSessions.find((s) => s.id === sessionId);
    if (!session) return;

    router.push({
      pathname: '/study/practice-session',
      params: {
        sessionId: session.id,
        topicId: session.topic_id,
        topicName: session.topic_name,
      },
    });
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('focused_topic_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (error) {
      if (__DEV__) { console.error('Error deleting session:', error); }
      Alert.alert('Error', 'Failed to delete session');
    }
  };

  const selectedTopic = getSelectedTopic();

  return (
    <View style={styles.container}>
      <PageHeader
        title="Focused Topic Practice"
        subtitle="Deep dive into specific topics"
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select a Topic</Text>
          <Text style={styles.sectionSubtitle}>
            Choose from the NCE topic hierarchy
          </Text>

          {topicHierarchy.map((topics, level) => (
            <View key={level} style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>
                Level {level + 1}: {level === 0 ? 'Section' : topics[0]?.depth_level === 1 ? 'Category' : topics[0]?.depth_level === 2 ? 'Subcategory' : 'Topic'}
              </Text>
              <View style={styles.dropdown}>
                <ScrollView
                  style={styles.dropdownScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {topics.map((topic) => (
                    <Pressable
                      key={topic.id}
                      style={[
                        styles.dropdownItem,
                        selectedTopics[level] === topic.id &&
                          styles.dropdownItemSelected,
                      ]}
                      onPress={() => handleTopicSelect(level, topic.id)}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          selectedTopics[level] === topic.id &&
                            styles.dropdownItemTextSelected,
                        ]}
                      >
                        {topic.name}
                      </Text>
                      {hasChildren(topic.id) && (
                        <ChevronDown
                          size={16}
                          color={
                            selectedTopics[level] === topic.id
                              ? Colors.primary
                              : Colors.text.tertiary
                          }
                        />
                      )}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
          ))}

          {selectedTopic && (
            <View style={styles.selectedTopicCard}>
              <BookOpen size={20} color={Colors.primary} />
              <View style={styles.selectedTopicInfo}>
                <Text style={styles.selectedTopicName}>
                  {selectedTopic.name}
                </Text>
                <Text style={styles.selectedTopicPath}>
                  {selectedTopic.full_path} - Section {selectedTopic.nce_section}
                </Text>
              </View>
            </View>
          )}

          <Pressable
            style={[
              styles.startButton,
              (!canStartSession() || loading) && styles.startButtonDisabled,
            ]}
            onPress={handleStartSession}
            disabled={!canStartSession() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Play size={20} color="#fff" fill="#fff" />
                <Text style={styles.startButtonText}>Start Practice Session</Text>
              </>
            )}
          </Pressable>

          {!canStartSession() && selectedTopic && hasChildren(selectedTopic.id) && (
            <Text style={styles.hint}>
              Please select a more specific topic to start practicing
            </Text>
          )}
        </View>

        {activeSessions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Continue Learning</Text>
            <Text style={styles.sectionSubtitle}>
              Resume your active practice sessions
            </Text>

            {activeSessions.map((session) => (
              <Pressable
                key={session.id}
                style={styles.sessionCard}
                onPress={() => resumeSession(session.id)}
              >
                <View style={styles.sessionHeader}>
                  <BookOpen size={18} color={Colors.primary} />
                  <Text style={styles.sessionTitle}>{session.topic_name}</Text>
                </View>
                <Text style={styles.sessionPath}>{session.topic_path}</Text>
                <View style={styles.sessionProgress}>
                  <View style={styles.progressBarBackground}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${(session.current_question_index / session.questions_count) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.sessionProgressText}>
                    {session.current_question_index} / {session.questions_count} questions
                  </Text>
                </View>
                <View style={styles.sessionFooter}>
                  <View style={styles.sessionTime}>
                    <Clock size={14} color={Colors.text.tertiary} />
                    <Text style={styles.sessionTimeText}>
                      Updated {new Date(session.updated_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Pressable
                    style={styles.deleteButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      Alert.alert(
                        'Delete Session',
                        'Are you sure you want to delete this session?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => deleteSession(session.id),
                          },
                        ]
                      );
                    }}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </Pressable>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
  },
  sectionSubtitle: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  dropdownContainer: {
    gap: Spacing.xs,
  },
  dropdownLabel: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
    fontSize: 14,
  },
  dropdown: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.light,
    maxHeight: 200,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  dropdownItemSelected: {
    backgroundColor: Colors.primary + '10',
  },
  dropdownItemText: {
    ...Typography.body,
    color: Colors.text.primary,
    flex: 1,
  },
  dropdownItemTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  selectedTopicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary + '10',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  selectedTopicInfo: {
    flex: 1,
    gap: 4,
  },
  selectedTopicName: {
    ...Typography.bodyBold,
    color: Colors.primary,
  },
  selectedTopicPath: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  startButtonDisabled: {
    backgroundColor: Colors.text.tertiary,
    opacity: 0.5,
  },
  startButtonText: {
    ...Typography.bodyBold,
    color: '#fff',
  },
  hint: {
    ...Typography.body,
    fontSize: 12,
    color: Colors.text.tertiary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  sessionCard: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sessionTitle: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
    flex: 1,
  },
  sessionPath: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  sessionProgress: {
    gap: 6,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: Colors.border.light,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  sessionProgressText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  sessionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  sessionTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionTimeText: {
    fontSize: 12,
    color: Colors.text.tertiary,
  },
  deleteButton: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
  },
  deleteButtonText: {
    fontSize: 12,
    color: Colors.error,
    fontWeight: '600',
  },
});
