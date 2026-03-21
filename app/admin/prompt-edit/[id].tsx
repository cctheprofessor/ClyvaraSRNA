import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { FeedPrompt } from '@/types/social-feed';
import { ArrowLeft } from 'lucide-react-native';
import PageHeader from '@/components/PageHeader';

export default function EditPromptScreen() {
  const { session, isAdmin } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [prompt, setPrompt] = useState<FeedPrompt | null>(null);
  const [promptText, setPromptText] = useState('');
  const [promptType, setPromptType] = useState<'image' | 'storytime'>('image');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/(tabs)/home');
      return;
    }
    loadPrompt();
  }, [id, isAdmin]);

  const loadPrompt = async () => {
    try {
      const { data, error } = await supabase
        .from('feed_prompts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setPrompt(data);
      setPromptText(data.prompt_text);
      setPromptType(data.prompt_type);
      setIsActive(data.is_active);
    } catch (error: any) {
      if (__DEV__) { console.error('Error loading prompt:', error); }
      if (Platform.OS === 'web') {
        alert('Failed to load prompt');
      } else {
        Alert.alert('Error', 'Failed to load prompt');
      }
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!promptText.trim()) {
      if (Platform.OS === 'web') {
        alert('Please enter prompt text');
      } else {
        Alert.alert('Error', 'Please enter prompt text');
      }
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('feed_prompts')
        .update({
          prompt_text: promptText.trim(),
          prompt_type: promptType,
          is_active: isActive,
        })
        .eq('id', id);

      if (error) throw error;

      if (Platform.OS === 'web') {
        alert('Prompt updated successfully');
      } else {
        Alert.alert('Success', 'Prompt updated successfully');
      }

      router.back();
    } catch (error: any) {
      if (__DEV__) { console.error('Error updating prompt:', error); }
      if (Platform.OS === 'web') {
        alert('Failed to update prompt');
      } else {
        Alert.alert('Error', 'Failed to update prompt');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <PageHeader title="Edit Prompt" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader title="Edit Prompt" />

      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={Colors.text.primary} size={24} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.label}>Prompt Type</Text>
          <View style={styles.typeSelector}>
            <Pressable
              style={[
                styles.typeButton,
                promptType === 'image' && styles.typeButtonActive,
              ]}
              onPress={() => setPromptType('image')}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  promptType === 'image' && styles.typeButtonTextActive,
                ]}
              >
                Image Challenge
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.typeButton,
                promptType === 'storytime' && styles.typeButtonActive,
              ]}
              onPress={() => setPromptType('storytime')}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  promptType === 'storytime' && styles.typeButtonTextActive,
                ]}
              >
                Storytime
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Prompt Text</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter your prompt..."
            placeholderTextColor={Colors.text.tertiary}
            value={promptText}
            onChangeText={setPromptText}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.statusSelector}>
            <Pressable
              style={[
                styles.statusButton,
                isActive && styles.statusButtonActive,
              ]}
              onPress={() => setIsActive(true)}
            >
              <Text
                style={[
                  styles.statusButtonText,
                  isActive && styles.statusButtonTextActive,
                ]}
              >
                Active
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.statusButton,
                !isActive && styles.statusButtonActive,
              ]}
              onPress={() => setIsActive(false)}
            >
              <Text
                style={[
                  styles.statusButtonText,
                  !isActive && styles.statusButtonTextActive,
                ]}
              >
                Inactive
              </Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Text>
        </Pressable>
      </ScrollView>
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
  },
  header: {
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.md,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  typeButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 2,
    borderColor: Colors.border.light,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  typeButtonTextActive: {
    color: Colors.primary,
  },
  textInput: {
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.text.primary,
    minHeight: 120,
  },
  statusSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statusButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 2,
    borderColor: Colors.border.light,
    alignItems: 'center',
  },
  statusButtonActive: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  statusButtonTextActive: {
    color: Colors.primary,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.light,
  },
});
