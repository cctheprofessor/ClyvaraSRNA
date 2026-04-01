import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { Brain, Target, Focus, ChartBar as BarChart3, ClipboardCheck, Lock, CircleAlert as AlertCircle, Info } from 'lucide-react-native';
import PageHeader from '@/components/PageHeader';

export default function StudyScreen() {
  const router = useRouter();
  const { profile } = useAuth();

  const diagnosticCompleted = profile?.diagnostic_completed ?? false;

  const features = [
    {
      id: 'practice25',
      title: '25 Practice Questions',
      description: 'Quick practice session to strengthen your weak spots',
      icon: Brain,
      color: Colors.primary,
      route: '/(tabs)/study/practice-25',
    },
    {
      id: 'practice50',
      title: '50 Practice Questions',
      description: 'Extended practice with comprehensive tracking',
      icon: Target,
      color: Colors.secondary,
      route: '/(tabs)/study/practice-50',
    },
    {
      id: 'focused',
      title: 'Focused Topic Practice',
      description: 'Deep dive into specific anesthesia topics',
      icon: Focus,
      color: Colors.primaryDark,
      route: '/(tabs)/study/focused-topic',
    },
    {
      id: 'analytics',
      title: 'Clyvara Analytica',
      description: 'Performance insights and learning analytics',
      icon: BarChart3,
      color: Colors.accent,
      route: '/(tabs)/study/analytics',
    },
  ];

  const handleFeaturePress = (feature: any) => {
    if (!diagnosticCompleted && (feature.id === 'practice25' || feature.id === 'practice50' || feature.id === 'focused' || feature.id === 'analytics')) {
      return;
    }
    router.push(feature.route as any);
  };

  const isFeatureLocked = (featureId: string) => {
    return !diagnosticCompleted && (featureId === 'practice25' || featureId === 'practice50' || featureId === 'focused' || featureId === 'analytics');
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title="Quiet Study Area"
        subtitle="Powered by Clyvara Analytica"
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {!diagnosticCompleted && (
          <>
            <View style={styles.bannerContainer}>
              <AlertCircle size={20} color={Colors.warning} />
              <Text style={styles.bannerText}>
                Complete your diagnostic exam to unlock practice features
              </Text>
            </View>

            <Pressable
              style={[styles.card, styles.diagnosticCard]}
              onPress={() => router.push('/(tabs)/study/diagnostic-exam')}
            >
              <View style={[styles.iconContainer, { backgroundColor: Colors.accent }]}>
                <ClipboardCheck color="#ffffff" size={28} />
              </View>
              <View style={styles.cardContent}>
                <View style={styles.diagnosticHeader}>
                  <Text style={styles.cardTitle}>Diagnostic Assessment</Text>
                  <View style={styles.requiredBadge}>
                    <Text style={styles.requiredBadgeText}>REQUIRED</Text>
                  </View>
                </View>
                <Text style={styles.cardDescription}>
                  One-time 50-question exam to personalize your learning
                </Text>
              </View>
            </Pressable>
          </>
        )}

        {features.map((feature) => {
          const Icon = feature.icon;
          const locked = isFeatureLocked(feature.id);

          return (
            <Pressable
              key={feature.id}
              style={[styles.card, locked && styles.cardLocked]}
              onPress={() => handleFeaturePress(feature)}
              disabled={locked}
            >
              <View style={[styles.iconContainer, { backgroundColor: feature.color }]}>
                {locked ? (
                  <Lock color="#ffffff" size={28} />
                ) : (
                  <Icon color="#ffffff" size={28} />
                )}
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, locked && styles.cardTitleLocked]}>
                  {feature.title}
                </Text>
                <Text style={[styles.cardDescription, locked && styles.cardDescriptionLocked]}>
                  {locked ? 'Complete diagnostic exam to unlock' : feature.description}
                </Text>
              </View>
              {locked && (
                <View style={styles.lockOverlay}>
                  <Lock size={24} color={Colors.textSecondary} />
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.persistentNotice}>
        <View style={styles.noticeIcon}>
          <Info size={16} color={Colors.text.tertiary} />
        </View>
        <Text style={styles.persistentNoticeText}>
          This feature sends your practice question data to Clyvara Analytica to generate a personalized plan to address your specific learning needs. Clyvara Analytica is a machine learning algorithm that does not collect personal information and only utilizes anonymized data.
        </Text>
      </View>
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
    gap: 12,
  },
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: '#FFF4E6',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  bannerText: {
    flex: 1,
    fontSize: 14,
    color: Colors.warning,
    fontWeight: '600',
  },
  diagnosticCard: {
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  diagnosticHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  requiredBadge: {
    backgroundColor: Colors.error,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.sm,
  },
  requiredBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardLocked: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  cardTitleLocked: {
    color: Colors.textSecondary,
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.text.tertiary,
  },
  cardDescriptionLocked: {
    color: Colors.textSecondary,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: BorderRadius.md,
  },
  persistentNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  noticeIcon: {
    marginTop: 1,
  },
  persistentNoticeText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: Colors.text.tertiary,
  },
});
