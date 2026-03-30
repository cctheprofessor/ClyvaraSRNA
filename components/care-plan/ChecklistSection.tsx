import { View, Text, StyleSheet } from 'react-native';
import { ChecklistItem } from '@/types/anesthesia-care-plan';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { CheckCircle2, AlertCircle } from 'lucide-react-native';

interface ChecklistSectionProps {
  items: ChecklistItem[];
}

export function ChecklistSection({ items }: ChecklistSectionProps) {
  if (!items || items.length === 0) {
    return null;
  }

  const preop = items.filter((i) => i.category === 'Preop');
  const intraop = items.filter((i) => i.category === 'Intraop');
  const postop = items.filter((i) => i.category === 'Postop');

  const renderCategory = (categoryItems: ChecklistItem[], categoryName: string) => {
    if (categoryItems.length === 0) return null;

    return (
      <View style={styles.category}>
        <Text style={styles.categoryTitle}>{categoryName}</Text>
        {categoryItems.map((item, index) => (
          <View key={index} style={styles.checklistItem}>
            {item.isCritical ? (
              <AlertCircle size={18} color={Colors.error} style={styles.icon} />
            ) : (
              <CheckCircle2 size={18} color={Colors.accent} style={styles.icon} />
            )}
            <Text style={[styles.itemText, item.isCritical && styles.criticalText]}>
              {item.label}
              {item.isCritical && ' (Critical)'}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderCategory(preop, 'Preoperative')}
      {renderCategory(intraop, 'Intraoperative')}
      {renderCategory(postop, 'Postoperative')}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  category: {
    marginBottom: Spacing.sm,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.backgroundTertiary,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  icon: {
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  itemText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  criticalText: {
    fontWeight: '600',
    color: Colors.error,
  },
});
