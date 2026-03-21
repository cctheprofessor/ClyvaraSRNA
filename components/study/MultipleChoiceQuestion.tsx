import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { MultipleChoiceQuestion as MultipleChoiceType } from '@/types/question';

interface MultipleChoiceQuestionProps {
  question: MultipleChoiceType;
  value: string | null;
  onChange: (value: string) => void;
  showResult?: boolean;
  isCorrect?: boolean;
  disabled?: boolean;
}

export default function MultipleChoiceQuestion({
  question,
  value,
  onChange,
  showResult = false,
  isCorrect,
  disabled = false,
}: MultipleChoiceQuestionProps) {
  const getOptionStyle = (optionId: string) => {
    const selected = value === optionId;

    if (showResult && selected) {
      return [styles.option, isCorrect ? styles.optionCorrect : styles.optionIncorrect];
    }
    if (selected) {
      return [styles.option, styles.optionSelected];
    }
    return styles.option;
  };

  const getOptionTextStyle = (optionId: string) => {
    const selected = value === optionId;

    if (showResult && selected) {
      return [styles.optionText, isCorrect ? styles.optionTextCorrect : styles.optionTextIncorrect];
    }
    if (selected) {
      return [styles.optionText, styles.optionTextSelected];
    }
    return styles.optionText;
  };

  if (!question.options || !Array.isArray(question.options) || question.options.length === 0) {
    if (__DEV__) {
    console.error('MultipleChoiceQuestion: Invalid or empty options', {
      questionId: question.id,
      options: question.options,
      fullQuestion: JSON.stringify(question, null, 2)
    });
    }
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            No options available for this question. This question may have invalid data.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {question.options.map((option) => (
        <Pressable
          key={option.id}
          style={getOptionStyle(option.id)}
          onPress={() => !disabled && onChange(option.id)}
          disabled={disabled}
        >
          <View style={styles.optionContent}>
            <View style={styles.radioOuter}>
              {value === option.id && <View style={styles.radioInner} />}
            </View>
            <Text style={getOptionTextStyle(option.id)}>{option.text}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  errorContainer: {
    backgroundColor: Colors.error + '10',
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
  },
});
