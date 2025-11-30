import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { FeedPrompt } from '@/types/social-feed';

interface CreateTextPostModalProps {
  visible: boolean;
  prompt: FeedPrompt | null;
  onClose: () => void;
  onPostCreated: () => void;
}

const MAX_CHARACTERS = 500;

export default function CreateTextPostModal({
  visible,
  prompt,
  onClose,
  onPostCreated,
}: CreateTextPostModalProps) {
  const { session } = useAuth();
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  const createPost = async () => {
    if (!text.trim() || !session?.user || !prompt) {
      Alert.alert('Error', 'Please enter some text for your post');
      return;
    }

    if (text.length > MAX_CHARACTERS) {
      Alert.alert('Error', `Post must be ${MAX_CHARACTERS} characters or less`);
      return;
    }

    setPosting(true);

    try {
      const { error } = await supabase.from('feed_posts').insert({
        user_id: session.user.id,
        prompt_id: prompt.id,
        post_type: 'text',
        content_text: text.trim(),
      });

      if (error) throw error;

      setText('');
      onPostCreated();
      onClose();
    } catch (error: any) {
      console.error('Error creating post:', error);
      Alert.alert('Post Failed', error.message || 'Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  const handleClose = () => {
    if (!posting) {
      setText('');
      onClose();
    }
  };

  const remainingCharacters = MAX_CHARACTERS - text.length;
  const isOverLimit = remainingCharacters < 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Share Your Story</Text>
            <Pressable onPress={handleClose} disabled={posting}>
              <X color={Colors.text.secondary} size={24} />
            </Pressable>
          </View>

          {prompt && (
            <View style={styles.promptContainer}>
              <Text style={styles.promptLabel}>Responding to:</Text>
              <Text style={styles.promptText}>{prompt.prompt_text}</Text>
            </View>
          )}

          <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
            <TextInput
              style={styles.textInput}
              placeholder="What's on your mind?"
              placeholderTextColor={Colors.text.tertiary}
              value={text}
              onChangeText={setText}
              multiline
              numberOfLines={8}
              maxLength={MAX_CHARACTERS + 50}
              editable={!posting}
              autoFocus
            />
          </ScrollView>

          <View style={styles.footer}>
            <Text
              style={[
                styles.characterCount,
                isOverLimit && styles.characterCountError,
              ]}
            >
              {remainingCharacters} characters remaining
            </Text>
            <Pressable
              style={[
                styles.postButton,
                (!text.trim() || posting || isOverLimit) &&
                  styles.postButtonDisabled,
              ]}
              onPress={createPost}
              disabled={!text.trim() || posting || isOverLimit}
            >
              {posting ? (
                <ActivityIndicator color={Colors.text.light} />
              ) : (
                <Text style={styles.postButtonText}>Post</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h3,
    color: Colors.text.primary,
  },
  promptContainer: {
    backgroundColor: Colors.secondaryLight + '20',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  promptLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  promptText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary,
  },
  scrollView: {
    maxHeight: 300,
  },
  textInput: {
    ...Typography.body,
    color: Colors.text.primary,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 150,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  characterCount: {
    fontSize: 13,
    color: Colors.text.tertiary,
  },
  characterCountError: {
    color: Colors.error,
    fontWeight: '600',
  },
  postButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.secondary,
    minWidth: 100,
    alignItems: 'center',
  },
  postButtonDisabled: {
    backgroundColor: Colors.text.tertiary,
    opacity: 0.5,
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.light,
  },
});
