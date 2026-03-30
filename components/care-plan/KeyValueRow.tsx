import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

interface KeyValueRowProps {
  label: string;
  value: string | number;
  vertical?: boolean;
}

export function KeyValueRow({ label, value, vertical = false }: KeyValueRowProps) {
  return (
    <View style={[styles.row, vertical && styles.vertical]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  vertical: {
    flexDirection: 'column',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: Colors.text.primary,
    flex: 2,
    textAlign: 'right',
  },
});
