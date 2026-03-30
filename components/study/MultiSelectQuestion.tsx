import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { MultiSelectQuestion as MultiSelectType } from '@/types/question';

interface MultiSelectQuestionProps {
  question: MultiSelectType;
  value: string[];
  onChange: (value: string[]) => void;
  showResult?: boolean;
  isCorrect?: boolean;
  disabled?: boolean;
}

export default function MultiSelectQuestion({
  question,
  value,
  onChange,
  showResult = false,
  isCorrect,
  disabled = false,
}: MultiSelectQuestionProps) {
  const handleToggle = (optionId: string) => {
    if (disabled) return;

    const newValue = value.includes(optionId)
      ? value.filter((id) => id !== optionId)
      : [...value, optionId];

    onChange(newValue);
  };

  const isSelected = (optionId: string) => value.includes(optionId);

  const getOptionStyle = (optionId: string) => {
    const selected = isSelected(optionId);

    if (showResult && selected) {
      return [styles.option, isCorrect ? styles.optionCorrect : styles.optionIncorrect];
    }
    if (selected) {
      return [styles.option, styles.optionSelected];
    }
    return styles.option;
  };

  const getOptionTextStyle = (optionId: string) => {
    const selected = isSelected(optionId);

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
    console.error('MultiSelectQuestion: Invalid or empty options', {
      questionId: question.id,
      options: question.options,
      fullQuestion: JSON.stringify(question, null, 2)
    });
    }
    return (
      <View style={styles.container}>
        <Text style={styles.hint}>Select all that apply</Text>
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
      <Text style={styles.hint}>Select all that apply</Text>
      {question.options.map((option) => (
        <Pressable
          key={option.id}
          style={getOptionStyle(option.id)}
          onPress={() => handleToggle(option.id)}
          disabled={disabled}
        >
          <View style={styles.optionContent}>
            <View style={styles.checkboxOuter}>
              {isSelected(option.id) && <View style={styles.checkboxInner} />}
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
  hint: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontStyle: 'italic',
    marginBottom: Spacing.xs,
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
