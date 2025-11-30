import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';

interface PageHeaderProps {
  title: string;
  subtitle: string;
}

export default function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <LinearGradient colors={[Colors.secondary, Colors.secondaryDark]} style={styles.header}>
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/Clyvara.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
  },
  logoContainer: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.full,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logo: {
    width: 120,
    height: 40,
  },
  title: {
    ...Typography.h2,
    color: Colors.text.light,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
});
