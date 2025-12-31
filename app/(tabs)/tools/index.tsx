import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import {
  Hospital,
  UserRound,
  MessageCircleQuestion,
  Calendar,
  User,
  Clock,
  LayoutDashboard,
  BookOpen,
} from 'lucide-react-native';
import PageHeader from '@/components/PageHeader';

export default function ToolsScreen() {
  const router = useRouter();

  const categories = [
    {
      title: 'TA Bookings',
      tools: [
        {
          id: 'book-session',
          title: 'Book a Session',
          description: 'Schedule time with a teaching assistant',
          icon: Calendar,
          color: '#4CAF50',
          route: '/(tabs)/tools/book-ta-session',
        },
        {
          id: 'my-bookings',
          title: 'My Bookings',
          description: 'View and manage your bookings',
          icon: BookOpen,
          color: '#2196F3',
          route: '/(tabs)/tools/my-bookings',
        },
        {
          id: 'ta-profile',
          title: 'TA Profile Setup',
          description: 'Set up your teaching assistant profile',
          icon: User,
          color: '#FF9800',
          route: '/(tabs)/tools/ta-profile-setup',
        },
        {
          id: 'ta-availability',
          title: 'Manage Availability',
          description: 'Set your available times for bookings',
          icon: Clock,
          color: '#9C27B0',
          route: '/(tabs)/tools/ta-availability',
        },
        {
          id: 'ta-dashboard',
          title: 'TA Dashboard',
          description: 'View your bookings and earnings',
          icon: LayoutDashboard,
          color: '#F44336',
          route: '/(tabs)/tools/ta-dashboard',
        },
      ],
    },
    {
      title: 'Clinical Preference Cards',
      tools: [
        {
          id: 'clinical-site',
          title: 'Clinical Site',
          description: 'Hospital/clinic and cases!',
          icon: Hospital,
          color: Colors.primary,
          route: '/(tabs)/tools/clinical-site',
        },
        {
          id: 'preceptor',
          title: 'Preceptor',
          description: 'Maximize your learning environment!',
          icon: UserRound,
          color: Colors.secondary,
          route: '/(tabs)/tools/preceptor',
        },
      ],
    },
    {
      title: 'Clinical Questions',
      tools: [
        {
          id: 'anonymous',
          title: 'Ask Anonymously!',
          description: 'Questions for the Clyvara Community',
          icon: MessageCircleQuestion,
          color: Colors.accent,
          route: '/(tabs)/tools/ask-anonymously',
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <PageHeader
        title="Clinical and Didactic Tools"
        subtitle="Community-Powered Insights"
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {categories.map((category, catIndex) => (
          <View key={catIndex} style={styles.category}>
            <Text style={styles.categoryTitle}>{category.title}</Text>
            <View style={styles.toolsGrid}>
              {category.tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Pressable
                    key={tool.id}
                    style={styles.toolCard}
                    onPress={() => router.push(tool.route as any)}
                  >
                    <View style={[styles.iconContainer, { backgroundColor: tool.color }]}>
                      <Icon color="#ffffff" size={28} />
                    </View>
                    <View style={styles.toolInfo}>
                      <Text style={styles.toolTitle}>{tool.title}</Text>
                      <Text style={styles.toolDescription}>{tool.description}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
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
  category: {
    gap: 12,
  },
  categoryTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
  },
  toolsGrid: {
    gap: 12,
  },
  toolCard: {
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
  toolInfo: {
    flex: 1,
  },
  toolTitle: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  toolDescription: {
    fontSize: 13,
    color: Colors.text.tertiary,
  },
});
