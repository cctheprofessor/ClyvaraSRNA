import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { AlertCircle } from 'lucide-react-native';

interface UnsupportedQuestionProps {
  questionType: string;
}

export default function UnsupportedQuestion({ questionType }: UnsupportedQuestionProps) {
  return (
    <View style={styles.container}>
      <AlertCircle color={Colors.warning} size={48} />
      <Text style={styles.title}>Question Type Not Yet Supported</Text>
      <Text style={styles.message}>
        This {questionType} question type will be available in a future update.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  title: {
    ...Typography.h3,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  message: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});
