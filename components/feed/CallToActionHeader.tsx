import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { Camera, PenLine } from 'lucide-react-native';
import { FeedPrompt } from '@/types/social-feed';

interface CallToActionHeaderProps {
  prompts: FeedPrompt[];
  onImagePromptPress: (prompt: FeedPrompt) => void;
  onTextPromptPress: (prompt: FeedPrompt) => void;
}

export default function CallToActionHeader({
  prompts,
  onImagePromptPress,
  onTextPromptPress,
}: CallToActionHeaderProps) {
  const imagePrompt = prompts.find((p) => p.prompt_type === 'image' && p.is_active);
  const textPrompt = prompts.find((p) => p.prompt_type === 'storytime' && p.is_active);

  return (
    <View style={styles.container}>
      {imagePrompt && (
        <Pressable
          style={[styles.promptCard, { backgroundColor: Colors.primary }]}
          onPress={() => onImagePromptPress(imagePrompt)}
        >
          <View style={styles.promptContent}>
            <View style={styles.iconContainer}>
              <Camera color={Colors.text.light} size={24} />
            </View>
            <View style={styles.promptTextContainer}>
              <Text style={styles.promptLabel}>Image Challenge</Text>
              <Text style={styles.promptText}>{imagePrompt.prompt_text}</Text>
            </View>
          </View>
        </Pressable>
      )}

      {textPrompt && (
        <Pressable
          style={[styles.promptCard, { backgroundColor: Colors.secondary }]}
          onPress={() => onTextPromptPress(textPrompt)}
        >
          <View style={styles.promptContent}>
            <View style={styles.iconContainer}>
              <PenLine color={Colors.text.light} size={24} />
            </View>
            <View style={styles.promptTextContainer}>
              <Text style={styles.promptLabel}>Storytime</Text>
              <Text style={styles.promptText}>{textPrompt.prompt_text}</Text>
            </View>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    backgroundColor: Colors.backgroundSecondary,
    gap: Spacing.sm,
  },
  promptCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  promptContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptTextContainer: {
    flex: 1,
    gap: 4,
  },
  promptLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  promptText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.light,
    lineHeight: 22,
  },
});
