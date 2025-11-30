import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';

interface QuestionCardProps {
  question: {
    id: string;
    question_text: string;
    options: Array<{ id: string; text: string }>;
    question_type?: string;
  };
  selectedAnswer: string | null;
  onSelectAnswer: (answerId: string) => void;
  showCorrect?: boolean;
  correctAnswer?: string;
  disabled?: boolean;
}

export default function QuestionCard({
  question,
  selectedAnswer,
  onSelectAnswer,
  showCorrect = false,
  correctAnswer,
  disabled = false,
}: QuestionCardProps) {
  const getOptionStyle = (optionId: string) => {
    if (showCorrect) {
      if (optionId === correctAnswer) {
        return [styles.option, styles.optionCorrect];
      }
      if (optionId === selectedAnswer && optionId !== correctAnswer) {
        return [styles.option, styles.optionIncorrect];
      }
    } else if (optionId === selectedAnswer) {
      return [styles.option, styles.optionSelected];
    }
    return styles.option;
  };

  const getOptionTextStyle = (optionId: string) => {
    if (showCorrect && optionId === correctAnswer) {
      return [styles.optionText, styles.optionTextCorrect];
    }
    if (showCorrect && optionId === selectedAnswer && optionId !== correctAnswer) {
      return [styles.optionText, styles.optionTextIncorrect];
    }
    if (optionId === selectedAnswer) {
      return [styles.optionText, styles.optionTextSelected];
    }
    return styles.optionText;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.questionText}>{question.question_text}</Text>

      <View style={styles.optionsContainer}>
        {question.options.map((option) => (
          <Pressable
            key={option.id}
            style={getOptionStyle(option.id)}
            onPress={() => !disabled && onSelectAnswer(option.id)}
            disabled={disabled}
          >
            <View style={styles.optionContent}>
              <View style={styles.radioOuter}>
                {selectedAnswer === option.id && (
                  <View style={styles.radioInner} />
                )}
              </View>
              <Text style={getOptionTextStyle(option.id)}>{option.text}</Text>
            </View>
          </Pressable>
        ))}
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
  questionText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
    lineHeight: 24,
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
});
