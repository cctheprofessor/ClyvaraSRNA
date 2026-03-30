import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { DragDropOrderingQuestion as DragDropOrderingQuestionType } from '@/types/question';
import { ArrowUp, ArrowDown, Check, X } from 'lucide-react-native';

interface DragDropOrderingQuestionProps {
  question: DragDropOrderingQuestionType;
  value: string[];
  onChange: (order: string[]) => void;
  showResult?: boolean;
  isCorrect?: boolean;
  disabled?: boolean;
}

export default function DragDropOrderingQuestion({
  question,
  value,
  onChange,
  showResult = false,
  isCorrect,
  disabled = false,
}: DragDropOrderingQuestionProps) {
  const [orderedItems, setOrderedItems] = useState<string[]>(
    value.length > 0 ? value : question.options.steps.map(step => step.id)
  );

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (disabled) return;

    const newOrder = [...orderedItems];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newOrder.length) return;

    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];

    setOrderedItems(newOrder);
    onChange(newOrder);
  };

  const getStepText = (stepId: string): string => {
    return question.options.steps.find(s => s.id === stepId)?.text || '';
  };

  const isStepInCorrectPosition = (stepId: string, currentIndex: number): boolean => {
    return question.options.correct_order[currentIndex] === stepId;
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.instructions}>
        Arrange the steps in the correct order using the arrow buttons
      </Text>

      <View style={styles.itemsContainer}>
        {orderedItems.map((stepId, index) => {
          const isFirst = index === 0;
          const isLast = index === orderedItems.length - 1;
          const isCorrectPosition = showResult && isStepInCorrectPosition(stepId, index);
          const isIncorrectPosition = showResult && !isCorrectPosition;

          return (
            <View
              key={stepId}
              style={[
                styles.itemRow,
                isCorrectPosition && styles.itemCorrect,
                isIncorrectPosition && styles.itemIncorrect,
              ]}
            >
              <View style={styles.positionBadge}>
                <Text style={styles.positionText}>{index + 1}</Text>
              </View>

              <Text style={[
                styles.itemText,
                (isCorrectPosition || isIncorrectPosition) && styles.itemTextResult,
              ]}>
                {getStepText(stepId)}
              </Text>

              {showResult ? (
                <View style={styles.resultIcon}>
                  {isCorrectPosition ? (
                    <Check size={24} color={Colors.success} />
                  ) : (
                    <X size={24} color={Colors.error} />
                  )}
                </View>
              ) : (
                <View style={styles.controls}>
                  <TouchableOpacity
                    onPress={() => moveItem(index, 'up')}
                    disabled={disabled || isFirst}
                    style={[
                      styles.controlButton,
                      (disabled || isFirst) && styles.controlButtonDisabled,
                    ]}
                  >
                    <ArrowUp
                      size={20}
                      color={(disabled || isFirst) ? Colors.text.disabled : Colors.primary}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => moveItem(index, 'down')}
                    disabled={disabled || isLast}
                    style={[
                      styles.controlButton,
                      (disabled || isLast) && styles.controlButtonDisabled,
                    ]}
                  >
                    <ArrowDown
                      size={20}
                      color={(disabled || isLast) ? Colors.text.disabled : Colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {showResult && (
        <View style={styles.resultContainer}>
          <Text style={[styles.resultText, isCorrect ? styles.correctText : styles.incorrectText]}>
            {isCorrect ? 'Correct!' : 'Incorrect'}
          </Text>
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
  itemsContainer: {
    gap: Spacing.sm,
  },
  itemRow: {
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  itemCorrect: {
    borderColor: Colors.success,
    backgroundColor: Colors.successLight,
  },
  itemIncorrect: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorLight,
  },
  positionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: {
    ...Typography.body,
    color: Colors.white,
    fontWeight: '600',
  },
  itemText: {
    ...Typography.body,
    color: Colors.text.primary,
    flex: 1,
  },
  itemTextResult: {
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  controlButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.backgroundSecondary,
  },
  controlButtonDisabled: {
    opacity: 0.3,
  },
  resultIcon: {
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
});
