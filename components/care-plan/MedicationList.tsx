import { View, Text, StyleSheet } from 'react-native';
import { MedicationItem } from '@/types/anesthesia-care-plan';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';

interface MedicationListProps {
  title: string;
  meds?: MedicationItem[];
  highlight?: boolean;
}

export function MedicationList({ title, meds, highlight = false }: MedicationListProps) {
  if (!meds || meds.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, highlight && styles.titleHighlight]}>{title}</Text>
      {meds.map((med, index) => (
        <View key={index} style={[styles.medCard, highlight && styles.medCardHighlight]}>
          <View style={styles.medHeader}>
            <Text style={styles.medName}>{med.name}</Text>
            <Text style={styles.medDose}>{med.dose}</Text>
          </View>
          <View style={styles.medDetails}>
            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Route: </Text>
              {med.route}
            </Text>
            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Timing: </Text>
              {med.timing}
            </Text>
            {med.reason && (
              <Text style={styles.reasonText}>
                <Text style={styles.detailLabel}>Reason: </Text>
                {med.reason}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  medCard: {
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm + 2,
    marginBottom: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
  },
  medHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  medName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
  },
  medDose: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary,
    marginLeft: Spacing.sm,
  },
  medDetails: {
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  detailLabel: {
    fontWeight: '600',
    color: Colors.text.primary,
  },
  reasonText: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  titleHighlight: {
    color: Colors.primary,
  },
  medCardHighlight: {
    backgroundColor: Colors.primaryLight + '15',
    borderLeftColor: Colors.primary,
    borderLeftWidth: 4,
  },
});
