import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { ArrowLeft, TrendingUp } from 'lucide-react-native';

export default function StudyProgressScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={Colors.primary} size={24} />
        </Pressable>
        <Image
          source={require('@/assets/images/Clyvara.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Study Progress</Text>
        <Text style={styles.subtitle}>Track Your Performance</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.emptyState}>
          <TrendingUp color={Colors.text.tertiary} size={64} />
          <Text style={styles.emptyStateTitle}>Coming Soon</Text>
          <Text style={styles.emptyStateText}>
            Study progress tracking features are being developed.
          </Text>

          <Link href="/(tabs)/home" asChild>
            <Pressable style={styles.homeLink}>
              <Text style={styles.homeLinkText}>Back to Home</Text>
            </Pressable>
          </Link>
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
  header: {
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  logo: {
    width: 100,
    height: 35,
    marginBottom: Spacing.sm,
    alignSelf: 'center',
  },
  title: {
    ...Typography.h2,
    color: Colors.text.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    marginTop: 100,
  },
  emptyStateTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyStateText: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  homeLink: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  homeLinkText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
