import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import {
  Brain,
  Target,
  Focus,
  BarChart3,
  MessageCircleQuestion,
} from 'lucide-react-native';
import PageHeader from '@/components/PageHeader';

export default function StudyScreen() {
  const router = useRouter();

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
    {
      id: 'ta',
      title: 'Ask a Teaching Assistant',
      description: 'Get expert help from experienced TAs',
      icon: MessageCircleQuestion,
      color: Colors.secondaryLight,
      route: '/(tabs)/study/ask-ta',
    },
  ];

  return (
    <View style={styles.container}>
      <PageHeader
        title="Quiet Study Area"
        subtitle="Curated Practice for your Specific Needs!"
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
