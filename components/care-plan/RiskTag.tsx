import { View, Text, StyleSheet } from 'react-native';
import { RiskLevel } from '@/types/anesthesia-care-plan';
import { BorderRadius, Spacing } from '@/constants/theme';

interface RiskTagProps {
  level: RiskLevel;
  label?: string;
}

export function RiskTag({ level, label }: RiskTagProps) {
  const colorMap = {
    Low: { bg: '#D1FAE5', text: '#065F46', border: '#10B981' },
    Moderate: { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
    High: { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
  };

  const colors = colorMap[level] || colorMap.Low;

  return (
    <View style={[styles.tag, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Text style={[styles.text, { color: colors.text }]}>
        {label ? `${label}: ${level}` : level}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
