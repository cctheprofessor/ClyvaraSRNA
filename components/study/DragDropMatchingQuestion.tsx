import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { DragDropMatchingQuestion as DragDropMatchingQuestionType } from '@/types/question';
import { Check, X } from 'lucide-react-native';

interface DragDropMatchingQuestionProps {
  question: DragDropMatchingQuestionType;
  value: Record<string, string>;
  onChange: (pairs: Record<string, string>) => void;
  showResult?: boolean;
  isCorrect?: boolean;
  disabled?: boolean;
}

export default function DragDropMatchingQuestion({
  question,
  value,
  onChange,
  showResult = false,
  isCorrect,
  disabled = false,
}: DragDropMatchingQuestionProps) {
  const [selectedColumnA, setSelectedColumnA] = useState<string | null>(null);

  const handleColumnAPress = (id: string) => {
    if (disabled) return;
    setSelectedColumnA(selectedColumnA === id ? null : id);
  };

  const handleColumnBPress = useCallback((bId: string) => {
    if (disabled || !selectedColumnA) return;

    const newPairs = { ...value };

    Object.keys(newPairs).forEach(aId => {
      if (newPairs[aId] === bId) {
        delete newPairs[aId];
      }
    });

    newPairs[selectedColumnA] = bId;
    onChange(newPairs);
    setSelectedColumnA(null);
  }, [disabled, selectedColumnA, value, onChange]);

  const handleClearPair = (aId: string) => {
    if (disabled) return;
    const newPairs = { ...value };
    delete newPairs[aId];
    onChange(newPairs);
  };

  const getMatchedAForB = (bId: string): string | undefined => {
    return Object.entries(value).find(([, matchedBId]) => matchedBId === bId)?.[0];
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.instructions}>
        Select an item from the left column, then tap its match on the right
      </Text>

      <View style={styles.columns}>
        <View style={styles.column}>
          <Text style={styles.columnTitle}>Column A</Text>
          {question.options.column_a.map((item) => {
            const isSelected = selectedColumnA === item.id;
            const isPaired = !!value[item.id];
            const isCorrectPair = showResult && question.options.correct_pairs[item.id] === value[item.id];
            const isIncorrectPair = showResult && isPaired && !isCorrectPair;

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.item,
                  isSelected && styles.itemSelected,
                  isPaired && styles.itemPaired,
                  isCorrectPair && styles.itemCorrect,
                  isIncorrectPair && styles.itemIncorrect,
                ]}
                onPress={() => handleColumnAPress(item.id)}
                disabled={disabled}
              >
                <Text style={[
                  styles.itemText,
                  (isSelected || isPaired) && styles.itemTextActive,
                ]}>
                  {item.text}
                </Text>
                {isPaired && (
                  <TouchableOpacity
                    onPress={() => handleClearPair(item.id)}
                    disabled={disabled}
                    style={styles.clearButton}
                  >
                    <X size={16} color={Colors.text.secondary} />
                  </TouchableOpacity>
                )}
                {isCorrectPair && <Check size={20} color={Colors.success} />}
                {isIncorrectPair && <X size={20} color={Colors.error} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.column}>
          <Text style={styles.columnTitle}>Column B</Text>
          {question.options.column_b.map((item) => {
            const matchedAId = getMatchedAForB(item.id);
            const isPaired = !!matchedAId;
            const isCorrectPair = showResult && matchedAId && question.options.correct_pairs[matchedAId] === item.id;
            const isIncorrectPair = showResult && isPaired && !isCorrectPair;

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.item,
                  isPaired && styles.itemPaired,
                  isCorrectPair && styles.itemCorrect,
                  isIncorrectPair && styles.itemIncorrect,
                ]}
                onPress={() => handleColumnBPress(item.id)}
                disabled={disabled || !selectedColumnA}
              >
                <Text style={[
                  styles.itemText,
                  isPaired && styles.itemTextActive,
                ]}>
                  {item.text}
                </Text>
                {isCorrectPair && <Check size={20} color={Colors.success} />}
                {isIncorrectPair && <X size={20} color={Colors.error} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {showResult && (
        <View style={styles.resultContainer}>
          <Text style={[styles.resultText, isCorrect ? styles.correctText : styles.incorrectText]}>
            {isCorrect ? 'Correct!' : 'Incorrect'}
          </Text>
          {!isCorrect && (
            <View style={styles.correctPairsContainer}>
              <Text style={styles.correctPairsTitle}>Correct Pairs:</Text>
              {Object.entries(question.options.correct_pairs).map(([aId, bId]) => {
                const aItem = question.options.column_a.find(item => item.id === aId);
                const bItem = question.options.column_b.find(item => item.id === bId);
                if (!aItem || !bItem) return null;
                return (
                  <View key={aId} style={styles.correctPairRow}>
                    <Text style={styles.correctPairText}>
                      {aItem.text} → {bItem.text}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  instructions: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  columns: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  column: {
    flex: 1,
    gap: Spacing.sm,
  },
  columnTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  item: {
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  itemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  itemPaired: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentLight,
  },
  itemCorrect: {
    borderColor: Colors.success,
    backgroundColor: Colors.successLight,
  },
  itemIncorrect: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorLight,
  },
  itemText: {
    ...Typography.body,
    color: Colors.text.secondary,
    flex: 1,
  },
  itemTextActive: {
    color: Colors.text.primary,
    fontWeight: '500',
  },
  clearButton: {
    padding: Spacing.xs,
  },
  resultContainer: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  resultText: {
    ...Typography.h3,
  },
  correctText: {
    color: Colors.success,
  },
  incorrectText: {
    color: Colors.error,
  },
  correctPairsContainer: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.success,
    width: '100%',
  },
  correctPairsTitle: {
    ...Typography.bodyBold,
    color: Colors.success,
    marginBottom: Spacing.sm,
  },
  correctPairRow: {
    paddingVertical: Spacing.xs,
  },
  correctPairText: {
    ...Typography.body,
    color: Colors.text.primary,
  },
});
