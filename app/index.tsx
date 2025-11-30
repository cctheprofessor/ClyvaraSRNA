import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/theme';

export default function Index() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      router.replace('/(auth)/welcome');
    }
  }, [loading]);

  return (
    <LinearGradient colors={[Colors.secondary, Colors.secondaryDark, '#0A5EB8']} style={styles.container}>
      <Image
        source={require('@/assets/images/brainie.png')}
        style={styles.mascot}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mascot: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  loader: {
    marginTop: 16,
  },
});