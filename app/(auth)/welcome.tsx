import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, Calculator, GraduationCap, Info } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <LinearGradient colors={[Colors.secondary, Colors.secondaryDark, '#0A5EB8']} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/brainie.png')}
            style={styles.mascot}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>Clyvara SRNA</Text>
        <Text style={styles.subtitle}>
          Your anesthesia bestie in your pocket!
        </Text>

        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <GraduationCap color="#ffffff" size={24} />
            <Text style={styles.featureText}>Board Prep</Text>
          </View>
          <View style={styles.feature}>
            <Calculator color="#ffffff" size={24} />
            <Text style={styles.featureText}>Clinical Tools</Text>
          </View>
          <View style={styles.feature}>
            <BookOpen color="#ffffff" size={24} />
            <Text style={styles.featureText}>Care Plans</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push('/(auth)/signup')}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.secondaryButtonText}>Sign In</Text>
          </Pressable>
        </View>

        <View style={styles.disclaimerBox}>
          <View style={styles.disclaimerRow}>
            <Info color="rgba(255,255,255,0.85)" size={15} style={styles.disclaimerIcon} />
            <Text style={styles.disclaimer}>
              For educational purposes only. Always consult a physician or qualified healthcare provider before making any medical decisions.
            </Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  mascot: {
    width: 120,
    height: 120,
  },
  title: {
    ...Typography.h1,
    color: Colors.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    maxWidth: 320,
  },
  featuresContainer: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 64,
  },
  feature: {
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: Colors.text.light,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Colors.primary,
    ...Typography.bodyBold,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1.5,
    borderColor: Colors.text.light,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: Colors.text.light,
    ...Typography.bodyBold,
  },
  disclaimerBox: {
    marginTop: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    maxWidth: 320,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  disclaimerIcon: {
    marginTop: 1,
  },
  disclaimer: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 18,
  },
});
