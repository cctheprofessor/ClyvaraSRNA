import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import {
  GraduationCap,
  Brain,
  Target,
  TrendingUp,
  Clock,
  Award,
} from 'lucide-react-native';
import PageHeader from '@/components/PageHeader';

export default function StudyScreen() {
  const router = useRouter();

  const features = [
    {
      id: 'plan',
      title: 'Study Plan Generator',
      description: 'Create personalized NBCRNA study plans',
      icon: GraduationCap,
      color: Colors.primary,
      route: '/study/plan-generator',
    },
    {
      id: 'questions',
      title: 'Practice Questions',
      description: 'Test knowledge with curated questions',
      icon: Brain,
      color: Colors.secondary,
      route: '/study/questions',
    },
    {
      id: 'progress',
      title: 'Study Progress',
      description: 'Track your learning journey',
      icon: TrendingUp,
      color: Colors.primaryDark,
      route: '/study/progress',
    },
    {
      id: 'sessions',
      title: 'Study Sessions',
      description: 'View your study history',
      icon: Clock,
      color: Colors.secondaryLight,
      route: '/study/sessions',
    },
    {
      id: 'topics',
      title: 'NBCRNA Topics',
      description: 'Browse exam topics',
      icon: Target,
      color: Colors.secondaryDark,
      route: '/study/topics',
    },
    {
      id: 'achievements',
      title: 'Achievements',
      description: 'Your study milestones',
      icon: Award,
      color: Colors.primary,
      route: '/study/achievements',
    },
  ];

  return (
    <View style={styles.container}>
      <PageHeader
        title="Quiet Study Area"
        subtitle="Shh...becase failure is not an option"
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Pressable
              key={feature.id}
              style={styles.card}
              onPress={() => router.push(feature.route as any)}
            >
              <View style={[styles.iconContainer, { backgroundColor: feature.color }]}>
                <Icon color="#ffffff" size={28} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{feature.title}</Text>
                <Text style={styles.cardDescription}>{feature.description}</Text>
              </View>
            </Pressable>
          );
        })}
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
    gap: 12,
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
  cardDescription: {
    fontSize: 14,
    color: Colors.text.tertiary,
  },
});
