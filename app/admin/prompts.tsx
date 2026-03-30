import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { FeedPrompt } from '@/types/social-feed';
import { Plus, CreditCard as Edit2, Trash2, ArrowLeft } from 'lucide-react-native';
import PageHeader from '@/components/PageHeader';

export default function AdminPromptsScreen() {
  const { session, isAdmin } = useAuth();
  const [prompts, setPrompts] = useState<FeedPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/(tabs)/home');
      return;
    }
    loadPrompts();
  }, [isAdmin]);

  const loadPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('feed_prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrompts(data || []);
    } catch (error: any) {
      if (__DEV__) { console.error('Error loading prompts:', error); }
      Alert.alert('Error', 'Failed to load prompts');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (prompt: FeedPrompt) => {
    try {
      const { error } = await supabase
        .from('feed_prompts')
        .update({ is_active: !prompt.is_active })
        .eq('id', prompt.id);

      if (error) throw error;

      setPrompts((prev) =>
        prev.map((p) => (p.id === prompt.id ? { ...p, is_active: !p.is_active } : p))
      );
    } catch (error: any) {
      if (__DEV__) { console.error('Error toggling prompt:', error); }
      Alert.alert('Error', 'Failed to update prompt');
    }
  };

  const handleDelete = (promptId: string) => {
    Alert.alert(
      'Delete Prompt',
      'Delete this prompt? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('feed_prompts').delete().eq('id', promptId);
              if (error) throw error;
              setPrompts((prev) => prev.filter((p) => p.id !== promptId));
              Alert.alert('Success', 'Prompt deleted');
            } catch (error: any) {
              if (__DEV__) { console.error('Error deleting prompt:', error); }
              Alert.alert('Error', 'Failed to delete prompt');
            }
          },
        },
      ]
    );
  };

  const renderPrompt = ({ item }: { item: FeedPrompt }) => (
    <View style={styles.promptCard}>
      <View style={styles.promptHeader}>
        <View style={styles.promptInfo}>
          <View style={[styles.typeBadge, item.prompt_type === 'image' ? styles.imageBadge : styles.textBadge]}>
            <Text style={styles.typeBadgeText}>
              {item.prompt_type === 'image' ? 'Image' : 'Storytime'}
            </Text>
          </View>
          <Text style={styles.promptText}>{item.prompt_text}</Text>
        </View>
      </View>

      <View style={styles.promptActions}>
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Active</Text>
          <Switch
            value={item.is_active}
            onValueChange={() => handleToggleActive(item)}
            trackColor={{ false: Colors.border.light, true: Colors.primary }}
            thumbColor={Colors.background}
          />
        </View>

        <View style={styles.actionButtons}>
          <Pressable
            style={styles.editButton}
            onPress={() => router.push(`/admin/prompt-edit/${item.id}`)}
          >
            <Edit2 color={Colors.primary} size={20} />
          </Pressable>

          <Pressable style={styles.deleteButton} onPress={() => handleDelete(item.id)}>
            <Trash2 color={Colors.error} size={20} />
          </Pressable>
        </View>
      </View>
    </View>
  );

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <PageHeader title="Manage Prompts" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader title="Manage Prompts" />

      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={Colors.text.primary} size={24} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <Pressable
          style={styles.createButton}
          onPress={() => router.push('/admin/prompt-create')}
        >
          <Plus color={Colors.text.light} size={20} />
          <Text style={styles.createButtonText}>New Prompt</Text>
        </Pressable>
      </View>

      {prompts.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No prompts yet</Text>
          <Text style={styles.emptySubtext}>Create your first prompt to get started</Text>
        </View>
      ) : (
        <FlatList
          data={prompts}
          renderItem={renderPrompt}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  backText: {
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.light,
  },
  list: {
    padding: Spacing.md,
  },
  promptCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  promptHeader: {
    marginBottom: Spacing.md,
  },
  promptInfo: {
    gap: Spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  imageBadge: {
    backgroundColor: Colors.primary + '20',
  },
  textBadge: {
    backgroundColor: Colors.secondary + '20',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  promptText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    lineHeight: 22,
  },
  promptActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  editButton: {
    padding: Spacing.xs,
  },
  deleteButton: {
    padding: Spacing.xs,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.text.tertiary,
  },
});
