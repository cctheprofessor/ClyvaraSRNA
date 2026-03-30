import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react-native';

interface SessionResultsProps {
  totalQuestions: number;
  correctAnswers: number;
  totalTime: number;
  insights?: {
    accuracy: number;
    learning_velocity?: number;
    weak_topics?: string[];
  };
  onContinue: () => void;
  onReview?: () => void;
}

export default function SessionResults({
  totalQuestions,
  correctAnswers,
  totalTime,
  insights,
  onContinue,
  onReview,
}: SessionResultsProps) {
  const accuracy = Math.round((correctAnswers / totalQuestions) * 100);
  const avgTimePerQuestion = Math.round(totalTime / totalQuestions);

  const getPerformanceMessage = () => {
    if (accuracy >= 90) return 'Excellent work!';
    if (accuracy >= 80) return 'Great job!';
    if (accuracy >= 70) return 'Good effort!';
    return 'Keep practicing!';
  };

  const getPerformanceColor = () => {
    if (accuracy >= 80) return Colors.success;
    if (accuracy >= 70) return Colors.warning;
    return Colors.error;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Session Complete!</Text>
        <Text style={styles.message}>{getPerformanceMessage()}</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { borderLeftColor: getPerformanceColor() }]}>
          <Text style={styles.statValue}>{accuracy}%</Text>
          <Text style={styles.statLabel}>Accuracy</Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: Colors.primary }]}>
          <View style={styles.statRow}>
            <CheckCircle color={Colors.success} size={20} />
            <Text style={styles.statValue}>{correctAnswers}</Text>
          </View>
          <Text style={styles.statLabel}>Correct</Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: Colors.error }]}>
          <View style={styles.statRow}>
            <XCircle color={Colors.error} size={20} />
            <Text style={styles.statValue}>{totalQuestions - correctAnswers}</Text>
          </View>
          <Text style={styles.statLabel}>Incorrect</Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: Colors.accent }]}>
          <View style={styles.statRow}>
            <Clock color={Colors.accent} size={20} />
            <Text style={styles.statValue}>{avgTimePerQuestion}s</Text>
          </View>
          <Text style={styles.statLabel}>Avg Time</Text>
        </View>
      </View>

      {insights?.learning_velocity && (
        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <TrendingUp color={Colors.primary} size={20} />
            <Text style={styles.insightTitle}>Learning Velocity</Text>
          </View>
          <Text style={styles.insightValue}>
            {insights.learning_velocity.toFixed(2)} questions/day
          </Text>
          <Text style={styles.insightDescription}>
            Your pace of learning and retention
          </Text>
        </View>
      )}

      {insights?.weak_topics && insights.weak_topics.length > 0 && (
        <View style={styles.weakTopicsCard}>
          <Text style={styles.weakTopicsTitle}>Focus Areas</Text>
          {insights.weak_topics.slice(0, 3).map((topic, index) => (
            <View key={index} style={styles.weakTopicItem}>
              <View style={styles.weakTopicBullet} />
              <Text style={styles.weakTopicText}>{topic}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        {onReview && (
          <Pressable style={styles.secondaryButton} onPress={onReview}>
            <Text style={styles.secondaryButtonText}>Review Answers</Text>
          </Pressable>
        )}
        <Pressable style={styles.primaryButton} onPress={onContinue}>
          <Text style={styles.primaryButtonText}>Continue</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.lg,
  },
  title: {
    ...Typography.h2,
    color: Colors.text.primary,
  },
  message: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  statsGrid: {
    gap: Spacing.sm,
  },
  statCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderLeftWidth: 4,
    gap: Spacing.xs,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statValue: {
    ...Typography.h3,
    color: Colors.text.primary,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.text.tertiary,
  },
  insightCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  insightTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
  },
  insightValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
  },
  insightDescription: {
    fontSize: 14,
    color: Colors.text.tertiary,
  },
  weakTopicsCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  weakTopicsTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  weakTopicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  weakTopicBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.warning,
  },
  weakTopicText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  actions: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  primaryButtonText: {
    ...Typography.bodyBold,
    color: Colors.text.light,
  },
  secondaryButton: {
    backgroundColor: Colors.backgroundTertiary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
  },
});
