import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Dimensions } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { mlClient } from '@/lib/ml-backend-client';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { TrendingUp, TrendingDown, Brain, Target, AlertCircle, BarChart3 } from 'lucide-react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - (Spacing.md * 4);

interface StudentInsights {
  overall_performance?: {
    total_questions: number;
    correct_answers: number;
    accuracy: number;
    average_response_time: number;
  };
  forgetting_curve?: Array<{
    days_since: number;
    retention_rate: number;
  }>;
  topic_performance?: Array<{
    topic_name: string;
    mastery_level: number;
    questions_attempted: number;
    accuracy: number;
  }>;
  weak_areas?: Array<{
    topic: string;
    accuracy: number;
    priority: string;
  }>;
  learning_velocity?: number;
}

export default function AnalyticsScreen() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<StudentInsights | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    if (!profile?.ml_user_id) {
      setError('ML sync required. Please complete your profile.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await mlClient.getStudentInsights(profile.ml_user_id);
      setInsights(data);
    } catch (err) {
      setError('Unable to load insights. Please try again later.');
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderPerformanceCards = () => {
    if (!insights || !insights.overall_performance) {
      return null;
    }

    const { overall_performance } = insights;
    const accuracyColor = overall_performance.accuracy >= 70 ? Colors.success :
                          overall_performance.accuracy >= 50 ? Colors.warning : Colors.error;

    return (
      <View style={styles.cardsContainer}>
        <View style={[styles.card, styles.cardHalf]}>
          <View style={styles.cardIcon}>
            <Target color={Colors.primary} size={24} />
          </View>
          <Text style={styles.cardValue}>{overall_performance.accuracy.toFixed(1)}%</Text>
          <Text style={styles.cardLabel}>Overall Accuracy</Text>
          <View style={[styles.accuracyBar, { backgroundColor: Colors.backgroundTertiary }]}>
            <View
              style={[
                styles.accuracyBarFill,
                { width: `${overall_performance.accuracy}%`, backgroundColor: accuracyColor }
              ]}
            />
          </View>
        </View>

        <View style={[styles.card, styles.cardHalf]}>
          <View style={styles.cardIcon}>
            <Brain color={Colors.secondary} size={24} />
          </View>
          <Text style={styles.cardValue}>{overall_performance.total_questions}</Text>
          <Text style={styles.cardLabel}>Questions Attempted</Text>
          <Text style={styles.cardSubtext}>
            {overall_performance.correct_answers} correct
          </Text>
        </View>

        {insights.learning_velocity !== undefined && (
          <View style={[styles.card, styles.cardFull]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <TrendingUp color={Colors.accent} size={24} />
              </View>
              <Text style={styles.cardTitle}>Learning Velocity</Text>
            </View>
            <Text style={styles.velocityValue}>
              {insights.learning_velocity.toFixed(2)}x
            </Text>
            <Text style={styles.cardSubtext}>
              {insights.learning_velocity > 1.0
                ? 'You are learning faster than average'
                : 'Keep practicing to improve your pace'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderForgettingCurve = () => {
    if (!insights || !insights.forgetting_curve || insights.forgetting_curve.length === 0) {
      return null;
    }

    const curve = insights.forgetting_curve;
    const maxDays = Math.max(...curve.map(p => p.days_since));
    const chartHeight = 150;
    const padding = 20;

    const points = curve.map((point, i) => {
      const x = padding + (i / (curve.length - 1)) * (CHART_WIDTH - padding * 2);
      const y = chartHeight - padding - (point.retention_rate / 100) * (chartHeight - padding * 2);
      return { x, y, retention: point.retention_rate, days: point.days_since };
    });

    const pathData = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Memory Retention Over Time</Text>
        <Text style={styles.chartSubtitle}>How well you remember concepts over days</Text>
        <Svg width={CHART_WIDTH} height={chartHeight} style={styles.chart}>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((val) => {
            const y = chartHeight - padding - (val / 100) * (chartHeight - padding * 2);
            return (
              <Line
                key={val}
                x1={padding}
                y1={y}
                x2={CHART_WIDTH - padding}
                y2={y}
                stroke={Colors.border.light}
                strokeWidth="1"
              />
            );
          })}

          {/* Curve line */}
          <Path
            d={pathData}
            stroke={Colors.primary}
            strokeWidth="3"
            fill="none"
          />

          {/* Data points */}
          {points.map((point, i) => (
            <Circle
              key={i}
              cx={point.x}
              cy={point.y}
              r="4"
              fill={Colors.primary}
            />
          ))}

          {/* Y-axis labels */}
          {[0, 50, 100].map((val) => {
            const y = chartHeight - padding - (val / 100) * (chartHeight - padding * 2);
            return (
              <SvgText
                key={val}
                x={padding - 10}
                y={y + 4}
                fontSize="10"
                fill={Colors.text.tertiary}
                textAnchor="end"
              >
                {val}%
              </SvgText>
            );
          })}
        </Svg>
        <View style={styles.chartLegend}>
          <Text style={styles.legendText}>Days since learning</Text>
        </View>
      </View>
    );
  };

  const renderTopicPerformance = () => {
    if (!insights || !insights.topic_performance || insights.topic_performance.length === 0) {
      return null;
    }

    const sortedTopics = [...insights.topic_performance]
      .filter(topic => typeof topic.mastery_level === 'number' && !isNaN(topic.mastery_level))
      .sort((a, b) => b.mastery_level - a.mastery_level)
      .slice(0, 8);

    if (sortedTopics.length === 0) {
      return null;
    }

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Topic Mastery Levels</Text>
        <Text style={styles.chartSubtitle}>Your progress across different topics</Text>
        <View style={styles.topicBars}>
          {sortedTopics.map((topic, index) => {
            const masteryLevel = topic.mastery_level ?? 0;
            const masteryColor = masteryLevel >= 80 ? Colors.success :
                                masteryLevel >= 60 ? Colors.accent :
                                masteryLevel >= 40 ? Colors.warning : Colors.error;

            return (
              <View key={index} style={styles.topicBarRow}>
                <Text style={styles.topicName} numberOfLines={1}>
                  {topic.topic_name}
                </Text>
                <View style={styles.topicBarContainer}>
                  <View
                    style={[
                      styles.topicBar,
                      {
                        width: `${masteryLevel}%`,
                        backgroundColor: masteryColor
                      }
                    ]}
                  />
                  <Text style={styles.topicValue}>{masteryLevel.toFixed(0)}%</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderWeakAreas = () => {
    if (!insights || !insights.weak_areas || insights.weak_areas.length === 0) {
      return null;
    }

    const priorityColor = (priority: string) => {
      switch (priority.toLowerCase()) {
        case 'high': return Colors.error;
        case 'medium': return Colors.warning;
        case 'low': return Colors.accent;
        default: return Colors.text.tertiary;
      }
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Areas for Improvement</Text>
        <Text style={styles.chartSubtitle}>Focus on these topics to improve your score</Text>
        <View style={styles.weakAreasList}>
          {insights.weak_areas.map((area, index) => (
            <View key={index} style={styles.weakAreaItem}>
              <View style={styles.weakAreaHeader}>
                <AlertCircle color={priorityColor(area.priority)} size={20} />
                <Text style={styles.weakAreaTopic}>{area.topic}</Text>
              </View>
              <View style={styles.weakAreaStats}>
                <Text style={styles.weakAreaAccuracy}>
                  {area.accuracy.toFixed(1)}% accuracy
                </Text>
                <View
                  style={[
                    styles.priorityBadge,
                    { backgroundColor: priorityColor(area.priority) + '20' }
                  ]}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      { color: priorityColor(area.priority) }
                    ]}
                  >
                    {area.priority.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <PageHeader
          title="Clyvara Analytica"
          subtitle="Your learning insights"
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your insights...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <PageHeader
          title="Clyvara Analytica"
          subtitle="Your learning insights"
        />
        <View style={styles.centered}>
          <AlertCircle color={Colors.error} size={48} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={loadInsights}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const hasNoData = !insights ||
    (!insights.overall_performance &&
     (!insights.forgetting_curve || insights.forgetting_curve.length === 0) &&
     (!insights.topic_performance || insights.topic_performance.length === 0) &&
     (!insights.weak_areas || insights.weak_areas.length === 0));

  if (hasNoData) {
    return (
      <View style={styles.container}>
        <PageHeader
          title="Clyvara Analytica"
          subtitle="Your learning insights"
        />
        <View style={styles.centered}>
          <BarChart3 color={Colors.text.tertiary} size={64} />
          <Text style={styles.noDataText}>No data available yet</Text>
          <Text style={styles.noDataSubtext}>
            Complete some practice questions to see your insights
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader
        title="Clyvara Analytica"
        subtitle="Your learning insights"
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {renderPerformanceCards()}
        {renderForgettingCurve()}
        {renderTopicPerformance()}
        {renderWeakAreas()}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Last updated: {new Date().toLocaleString()}
          </Text>
        </View>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginTop: Spacing.md,
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  noDataText: {
    ...Typography.h3,
    color: Colors.text.primary,
    marginTop: Spacing.md,
  },
  noDataSubtext: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    ...Typography.bodyBold,
    color: Colors.text.light,
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHalf: {
    flex: 1,
    minWidth: 150,
  },
  cardFull: {
    width: '100%',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
  },
  cardValue: {
    ...Typography.h2,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  cardLabel: {
    ...Typography.caption,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  cardSubtext: {
    ...Typography.small,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  velocityValue: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.accent,
    marginBottom: Spacing.xs,
  },
  accuracyBar: {
    height: 8,
    borderRadius: 4,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  accuracyBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  chartContainer: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  chartSubtitle: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginBottom: Spacing.md,
  },
  chart: {
    marginVertical: Spacing.sm,
  },
  chartLegend: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  legendText: {
    ...Typography.small,
    color: Colors.text.tertiary,
  },
  topicBars: {
    gap: Spacing.md,
  },
  topicBarRow: {
    gap: Spacing.xs,
  },
  topicName: {
    ...Typography.caption,
    color: Colors.text.secondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  topicBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  topicBar: {
    height: 24,
    borderRadius: BorderRadius.sm,
    minWidth: 2,
  },
  topicValue: {
    ...Typography.small,
    color: Colors.text.secondary,
    fontWeight: '600',
    minWidth: 40,
  },
  weakAreasList: {
    gap: Spacing.md,
  },
  weakAreaItem: {
    padding: Spacing.md,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  weakAreaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  weakAreaTopic: {
    ...Typography.body,
    color: Colors.text.primary,
    fontWeight: '600',
    flex: 1,
  },
  weakAreaStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weakAreaAccuracy: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  priorityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  priorityText: {
    ...Typography.small,
    fontWeight: '700',
    fontSize: 10,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  footerText: {
    ...Typography.small,
    color: Colors.text.tertiary,
  },
});
