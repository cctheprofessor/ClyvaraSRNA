import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  headerColor?: string;
}

export function SectionCard({ title, children, headerColor }: SectionCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.header, headerColor && { backgroundColor: headerColor }]}>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
  },
  title: {
    ...Typography.h4,
    color: '#fff',
  },
  content: {
    padding: Spacing.md,
  },
});
