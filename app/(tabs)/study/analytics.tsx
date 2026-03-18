import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { mlClient } from '@/lib/ml-backend-client';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { TrendingUp, TrendingDown, Brain, Target, CircleAlert as AlertCircle, ChartBar as BarChart3 } from 'lucide-react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

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
  const router = useRouter();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<StudentInsights | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile && !profile.diagnostic_completed) {
      router.replace('/(tabs)/study/diagnostic-exam');
      return;
    }
    loadInsights();
  }, [profile]);

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
    const accuracy = overall_performance.accuracy ?? 0;
    const accuracyColor = accuracy >= 70 ? Colors.success :
                          accuracy >= 50 ? Colors.warning : Colors.error;

    return (
      <View style={styles.cardsContainer}>
        <View style={[styles.card, styles.cardHalf]}>
          <View style={styles.cardIcon}>
            <Target color={Colors.primary} size={24} />
          </View>
          <Text style={styles.cardValue}>{accuracy.toFixed(1)}%</Text>
          <Text style={styles.cardLabel}>Overall Accuracy</Text>
          <View style={[styles.accuracyBar, { backgroundColor: Colors.backgroundTertiary }]}>
            <View
              style={[
                styles.accuracyBarFill,
                { width: `${accuracy}%`, backgroundColor: accuracyColor }
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
              {(insights.learning_velocity * 100).toFixed(0)}%
            </Text>
            <Text style={styles.cardSubtext}>
              Learning velocity measures how quickly you master new concepts compared to your baseline. Higher percentages indicate faster progress and better retention.
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

    const curve = insights.forgetting_curve.filter(
      p => typeof p.retention_rate === 'number' && !isNaN(p.retention_rate) &&
           typeof p.days_since === 'number' && !isNaN(p.days_since)
    );

    if (curve.length === 0) return null;

    const chartHeight = 220;
    const paddingLeft = 44;
    const paddingRight = 16;
    const paddingTop = 12;
    const paddingBottom = 36;
    const plotWidth = CHART_WIDTH - paddingLeft - paddingRight;
    const plotHeight = chartHeight - paddingTop - paddingBottom;

    const points = curve.map((point, i) => {
      const retention = point.retention_rate ?? 0;
      const x = paddingLeft + (curve.length > 1 ? (i / (curve.length - 1)) : 0.5) * plotWidth;
      const y = paddingTop + (1 - retention / 100) * plotHeight;
      return { x, y, retention, days: point.days_since };
    });

    const linePath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');

    const areaPath = linePath
      + ` L ${points[points.length - 1].x.toFixed(1)} ${(paddingTop + plotHeight).toFixed(1)}`
      + ` L ${points[0].x.toFixed(1)} ${(paddingTop + plotHeight).toFixed(1)} Z`;

    const yLabels = [0, 25, 50, 75, 100];
    const xLabels = curve.length <= 7
      ? curve.map((p, i) => ({ i, days: p.days_since }))
      : [0, Math.floor((curve.length - 1) / 3), Math.floor((curve.length - 1) * 2 / 3), curve.length - 1]
          .map(i => ({ i, days: curve[i].days_since }));

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Memory Retention Over Time</Text>
        <Text style={styles.chartSubtitle}>How well you retain concepts over days</Text>
        <Svg width={CHART_WIDTH} height={chartHeight}>
          <Defs>
            <LinearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={Colors.primary} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={Colors.primary} stopOpacity="0.02" />
            </LinearGradient>
          </Defs>

          {yLabels.map((val) => {
            const y = paddingTop + (1 - val / 100) * plotHeight;
            return (
              <Line
                key={`grid-${val}`}
                x1={paddingLeft}
                y1={y}
                x2={CHART_WIDTH - paddingRight}
                y2={y}
                stroke={val === 0 ? Colors.border.dark : Colors.border.light}
                strokeWidth={val === 0 ? '1.5' : '1'}
                strokeDasharray={val === 0 ? undefined : '4 3'}
              />
            );
          })}

          {yLabels.map((val) => {
            const y = paddingTop + (1 - val / 100) * plotHeight;
            return (
              <SvgText
                key={`ylabel-${val}`}
                x={paddingLeft - 6}
                y={y + 4}
                fontSize="11"
                fontWeight="600"
                fill={Colors.text.tertiary}
                textAnchor="end"
              >
                {val}%
              </SvgText>
            );
          })}

          <Path d={areaPath} fill="url(#curveGradient)" />

          <Path
            d={linePath}
            stroke={Colors.primary}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((point, i) => (
            <Circle
              key={i}
              cx={point.x}
              cy={point.y}
              r="4"
              fill={Colors.background}
              stroke={Colors.primary}
              strokeWidth="2"
            />
          ))}

          {xLabels.map(({ i, days }) => {
            const x = points[i]?.x ?? 0;
            return (
              <SvgText
                key={`xlabel-${i}`}
                x={x}
                y={chartHeight - 6}
                fontSize="11"
                fontWeight="600"
                fill={Colors.text.tertiary}
                textAnchor="middle"
              >
                {days === 0 ? 'Day 0' : `Day ${days}`}
              </SvgText>
            );
          })}
        </Svg>

        <View style={styles.retentionCallouts}>
          {points.map((point, i) => (
            <View key={i} style={styles.retentionCallout}>
              <Text style={styles.retentionCalloutValue}>{point.retention.toFixed(0)}%</Text>
              <Text style={styles.retentionCalloutLabel}>Day {point.days}</Text>
            </View>
          )).slice(0, 5)}
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
                  {(area.accuracy ?? 0).toFixed(1)}% accuracy
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
  retentionCallouts: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  retentionCallout: {
    alignItems: 'center',
    gap: 2,
  },
  retentionCalloutValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  retentionCalloutLabel: {
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
