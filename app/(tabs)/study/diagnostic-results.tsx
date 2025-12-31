import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { mlClient } from '@/lib/ml-backend-client';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { CheckCircle, TrendingUp, TrendingDown, Award, Target, AlertCircle } from 'lucide-react-native';

interface DiagnosticResults {
  attempt_id: string;
  total_score: number;
  total_questions: number;
  percentage: number;
  completed_at: string;
  section_scores: Array<{
    section: string;
    correct: number;
    total: number;
    percentage: number;
  }>;
  bloom_scores: Array<{
    level: string;
    correct: number;
    total: number;
    percentage: number;
  }>;
  type_scores: Array<{
    type: string;
    correct: number;
    total: number;
    percentage: number;
  }>;
  strengths: string[];
  weaknesses: string[];
  recommended_topics: Array<{
    topic: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export default function DiagnosticResultsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<DiagnosticResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!profile?.diagnostic_completed) {
        setError('Diagnostic not completed yet.');
        setLoading(false);
        return;
      }

      try {
        if (profile.ml_user_id) {
          const diagnosticResults = await mlClient.getDiagnosticResults(profile.ml_user_id);
          setResults(diagnosticResults);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.log('[DiagnosticResults] Backend results not available, using local data');
      }

      const score = profile.diagnostic_score || 0;
      const totalQuestions = 50;
      const percentage = (score / totalQuestions) * 100;

      const basicResults: DiagnosticResults = {
        attempt_id: profile.diagnostic_attempt_id || '',
        total_score: score,
        total_questions: totalQuestions,
        percentage,
        completed_at: profile.diagnostic_completed_at || new Date().toISOString(),
        section_scores: [],
        bloom_scores: [],
        type_scores: [],
        strengths: percentage >= 70 ? ['Strong overall performance'] : [],
        weaknesses: percentage < 70 ? ['Continue practicing to improve'] : [],
        recommended_topics: percentage < 80 ? [
          {
            topic: 'Review all NCE topics',
            reason: 'Strengthen your knowledge across all areas',
            priority: 'high' as const,
          }
        ] : [],
      };

      setResults(basicResults);
      setLoading(false);
    } catch (err: any) {
      console.error('[DiagnosticResults] Error loading results:', err);
      setError(err.message || 'Failed to load results. Please try again.');
      setLoading(false);
    }
  };

  const getScoreColor = (percentage: number): string => {
    if (percentage >= 70) return Colors.success;
    if (percentage >= 50) return Colors.warning;
    return Colors.error;
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low'): string => {
    switch (priority) {
      case 'high':
        return Colors.error;
      case 'medium':
        return Colors.warning;
      case 'low':
        return Colors.info;
      default:
        return Colors.textSecondary;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <PageHeader title="Diagnostic Results" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your results...</Text>
        </View>
      </View>
    );
  }

  if (error || !results) {
    return (
      <View style={styles.container}>
        <PageHeader title="Diagnostic Results" />
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error || 'Results not available'}</Text>
          <Pressable style={styles.retryButton} onPress={loadResults}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader title="Diagnostic Results" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.overallScoreCard}>
          <Award size={48} color={getScoreColor(results.percentage)} />
          <Text style={styles.overallScoreTitle}>Overall Score</Text>
          <Text style={[styles.overallScore, { color: getScoreColor(results.percentage) }]}>
            {results.total_score}/{results.total_questions}
          </Text>
          <Text style={styles.overallPercentage}>{Math.round(results.percentage)}%</Text>
          <Text style={styles.completedDate}>
            Completed {new Date(results.completed_at).toLocaleDateString()}
          </Text>
        </View>

        {results.section_scores.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NCE Section Performance</Text>
            {results.section_scores.map((section, index) => (
              <View key={index} style={styles.scoreItem}>
                <View style={styles.scoreItemHeader}>
                  <Text style={styles.scoreItemLabel}>{section.section}</Text>
                  <Text style={[styles.scoreItemValue, { color: getScoreColor(section.percentage) }]}>
                    {section.correct}/{section.total} ({Math.round(section.percentage)}%)
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${section.percentage}%`, backgroundColor: getScoreColor(section.percentage) },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {results.bloom_scores.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bloom's Taxonomy Levels</Text>
            {results.bloom_scores.map((bloom, index) => (
              <View key={index} style={styles.scoreItem}>
                <View style={styles.scoreItemHeader}>
                  <Text style={styles.scoreItemLabel}>{bloom.level}</Text>
                  <Text style={[styles.scoreItemValue, { color: getScoreColor(bloom.percentage) }]}>
                    {bloom.correct}/{bloom.total} ({Math.round(bloom.percentage)}%)
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${bloom.percentage}%`, backgroundColor: getScoreColor(bloom.percentage) },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {results.type_scores.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Question Type Performance</Text>
            {results.type_scores.map((type, index) => (
              <View key={index} style={styles.scoreItem}>
                <View style={styles.scoreItemHeader}>
                  <Text style={styles.scoreItemLabel}>{type.type.replace(/_/g, ' ')}</Text>
                  <Text style={[styles.scoreItemValue, { color: getScoreColor(type.percentage) }]}>
                    {type.correct}/{type.total} ({Math.round(type.percentage)}%)
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${type.percentage}%`, backgroundColor: getScoreColor(type.percentage) },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {results.strengths.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderWithIcon}>
              <TrendingUp size={24} color={Colors.success} />
              <Text style={styles.sectionTitle}>Your Strengths</Text>
            </View>
            {results.strengths.map((strength, index) => (
              <View key={index} style={styles.listItem}>
                <CheckCircle size={20} color={Colors.success} />
                <Text style={styles.listItemText}>{strength}</Text>
              </View>
            ))}
          </View>
        )}

        {results.weaknesses.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderWithIcon}>
              <TrendingDown size={24} color={Colors.warning} />
              <Text style={styles.sectionTitle}>Areas for Improvement</Text>
            </View>
            {results.weaknesses.map((weakness, index) => (
              <View key={index} style={styles.listItem}>
                <Target size={20} color={Colors.warning} />
                <Text style={styles.listItemText}>{weakness}</Text>
              </View>
            ))}
          </View>
        )}

        {results.recommended_topics.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recommended Focus Topics</Text>
            <Text style={styles.sectionDescription}>
              Based on your performance, we recommend starting with these topics:
            </Text>
            {results.recommended_topics.map((topic, index) => (
              <View key={index} style={styles.recommendationCard}>
                <View style={styles.recommendationHeader}>
                  <Text style={styles.recommendationTopic}>{topic.topic}</Text>
                  <View
                    style={[
                      styles.priorityBadge,
                      { backgroundColor: getPriorityColor(topic.priority) },
                    ]}
                  >
                    <Text style={styles.priorityText}>{topic.priority.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.recommendationReason}>{topic.reason}</Text>
              </View>
            ))}
          </View>
        )}

        <Pressable
          style={styles.continueButton}
          onPress={() => router.replace('/study')}
        >
          <Text style={styles.continueButtonText}>Continue to Practice</Text>
          <CheckCircle size={20} color={Colors.white} />
        </Pressable>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    marginTop: Spacing.md,
    fontSize: Typography.body.fontSize,
    color: Colors.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  overallScoreCard: {
    margin: Spacing.md,
    padding: Spacing.xl,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overallScoreTitle: {
    marginTop: Spacing.md,
    fontSize: Typography.h3.fontSize,
    fontWeight: '600',
    color: Colors.text,
  },
  overallScore: {
    marginTop: Spacing.xs,
    fontSize: 48,
    fontWeight: '700',
  },
  overallPercentage: {
    fontSize: Typography.h2.fontSize,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  completedDate: {
    marginTop: Spacing.sm,
    fontSize: Typography.small.fontSize,
    color: Colors.textSecondary,
  },
  section: {
    margin: Spacing.md,
    marginTop: 0,
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
  },
  sectionTitle: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  sectionHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  sectionDescription: {
    fontSize: Typography.small.fontSize,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  scoreItem: {
    marginBottom: Spacing.md,
  },
  scoreItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  scoreItemLabel: {
    fontSize: Typography.body.fontSize,
    color: Colors.text,
    flex: 1,
  },
  scoreItemValue: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  listItemText: {
    flex: 1,
    fontSize: Typography.body.fontSize,
    color: Colors.text,
  },
  recommendationCard: {
    padding: Spacing.md,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  recommendationTopic: {
    flex: 1,
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.text,
  },
  priorityBadge: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
  },
  recommendationReason: {
    fontSize: Typography.small.fontSize,
    color: Colors.textSecondary,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    margin: Spacing.md,
    marginTop: 0,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  continueButtonText: {
    color: Colors.white,
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: Spacing.xl,
  },
});
