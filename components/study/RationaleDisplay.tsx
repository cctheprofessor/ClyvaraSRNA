import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { BookOpen } from 'lucide-react-native';

interface RationaleDisplayProps {
  rationale?: string;
  optionRationales?: Record<string, string>;
  correctAnswers?: string[];
  isCorrect: boolean;
}

export default function RationaleDisplay({
  rationale,
  optionRationales,
  correctAnswers,
  isCorrect,
}: RationaleDisplayProps) {
  if (!rationale && !optionRationales) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BookOpen size={20} color={Colors.primary} />
        <Text style={styles.headerText}>Explanation</Text>
      </View>

      {rationale && (
        <View style={styles.rationaleCard}>
          <Text style={styles.rationaleText}>{rationale}</Text>
        </View>
      )}

      {correctAnswers && correctAnswers.length > 0 && !isCorrect && (
        <View style={styles.correctAnswersCard}>
          <Text style={styles.correctAnswersLabel}>Correct answer(s):</Text>
          {correctAnswers.map((answer, index) => (
            <Text key={index} style={styles.correctAnswerText}>• {answer}</Text>
          ))}
        </View>
      )}

      {optionRationales && Object.keys(optionRationales).length > 0 && (
        <View style={styles.optionRationalesContainer}>
          {Object.entries(optionRationales).map(([optionId, optionRationale]) => (
            <View key={optionId} style={styles.optionRationaleCard}>
              <Text style={styles.optionLabel}>Option {optionId}:</Text>
              <Text style={styles.optionRationaleText}>{optionRationale}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  headerText: {
    ...Typography.h4,
    color: Colors.primary,
  },
  rationaleCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  rationaleText: {
    ...Typography.body,
    color: Colors.text.primary,
    lineHeight: 22,
  },
  correctAnswersCard: {
    backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  correctAnswersLabel: {
    ...Typography.bodyBold,
    color: Colors.success,
    marginBottom: Spacing.xs,
  },
  correctAnswerText: {
    ...Typography.body,
    color: Colors.text.primary,
  },
  optionRationalesContainer: {
    gap: Spacing.sm,
  },
  optionRationaleCard: {
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  optionLabel: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
  },
  optionRationaleText: {
    ...Typography.body,
    color: Colors.text.secondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
