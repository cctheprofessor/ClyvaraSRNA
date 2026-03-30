import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { Question, MultipleChoiceQuestion, MultiSelectQuestion } from '@/types/question';

interface QuestionCardProps {
  question: Question;
  selectedAnswer: string | string[] | null;
  onSelectAnswer: (answerId: string | string[]) => void;
  showResult?: boolean;
  isCorrect?: boolean;
  disabled?: boolean;
}

export default function QuestionCard({
  question,
  selectedAnswer,
  onSelectAnswer,
  showResult = false,
  isCorrect,
  disabled = false,
}: QuestionCardProps) {
  const isMultiSelect = question.question_type === 'multi_select';
  const selectedAnswers = Array.isArray(selectedAnswer) ? selectedAnswer : selectedAnswer ? [selectedAnswer] : [];

  const handleOptionPress = (optionId: string) => {
    if (disabled) return;

    if (isMultiSelect) {
      const newSelection = selectedAnswers.includes(optionId)
        ? selectedAnswers.filter((id) => id !== optionId)
        : [...selectedAnswers, optionId];
      onSelectAnswer(newSelection);
    } else {
      onSelectAnswer(optionId);
    }
  };

  const isOptionSelected = (optionId: string) => selectedAnswers.includes(optionId);

  const getOptionStyle = (optionId: string) => {
    const selected = isOptionSelected(optionId);

    if (showResult) {
      if (isCorrect && selected) {
        return [styles.option, styles.optionCorrect];
      }
      if (!isCorrect && selected) {
        return [styles.option, styles.optionIncorrect];
      }
    } else if (selected) {
      return [styles.option, styles.optionSelected];
    }
    return styles.option;
  };

  const getOptionTextStyle = (optionId: string) => {
    const selected = isOptionSelected(optionId);

    if (showResult && selected) {
      return [
        styles.optionText,
        isCorrect ? styles.optionTextCorrect : styles.optionTextIncorrect,
      ];
    }
    if (selected) {
      return [styles.optionText, styles.optionTextSelected];
    }
    return styles.optionText;
  };

  const renderOptions = () => {
    if (question.question_type === 'multiple_choice' || question.question_type === 'multi_select') {
      return question.options.map((option) => (
        <Pressable
          key={option.id}
          style={getOptionStyle(option.id)}
          onPress={() => handleOptionPress(option.id)}
          disabled={disabled}
        >
          <View style={styles.optionContent}>
            <View style={isMultiSelect ? styles.checkboxOuter : styles.radioOuter}>
              {isOptionSelected(option.id) && (
                <View style={isMultiSelect ? styles.checkboxInner : styles.radioInner} />
              )}
            </View>
            <Text style={getOptionTextStyle(option.id)}>{option.text}</Text>
          </View>
        </Pressable>
      ));
    }

    // Placeholder for other question types
    return <Text style={styles.unsupportedText}>This question type is not yet supported</Text>;
  };

  return (
    <View style={styles.container}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionText}>{question.question_text}</Text>
        {isMultiSelect && (
          <Text style={styles.multiSelectHint}>Select all that apply</Text>
        )}
      </View>

      <View style={styles.optionsContainer}>
        {renderOptions()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  questionHeader: {
    gap: Spacing.xs,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
    lineHeight: 24,
  },
  multiSelectHint: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontStyle: 'italic',
  },
  optionsContainer: {
    gap: Spacing.sm,
  },
  option: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border.light,
  },
  optionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight + '10',
  },
  optionCorrect: {
    borderColor: Colors.success,
    backgroundColor: Colors.success + '10',
  },
  optionIncorrect: {
    borderColor: Colors.error,
    backgroundColor: Colors.error + '10',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  checkboxOuter: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  optionText: {
    ...Typography.body,
    color: Colors.text.primary,
    flex: 1,
  },
  optionTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  optionTextCorrect: {
    color: Colors.success,
    fontWeight: '600',
  },
  optionTextIncorrect: {
    color: Colors.error,
    fontWeight: '600',
  },
  unsupportedText: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
    padding: Spacing.lg,
  },
});
