import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { ClinicalScenarioQuestion as ClinicalScenarioQuestionType, Question, AnswerFormat, serializeAnswer } from '@/types/question';
import { ChevronRight, ChevronLeft } from 'lucide-react-native';
import QuestionRenderer from './QuestionRenderer';

interface ClinicalScenarioQuestionProps {
  question: ClinicalScenarioQuestionType;
  value: Record<string, AnswerFormat>;
  onChange: (subAnswers: Record<string, AnswerFormat>) => void;
  showResult?: boolean;
  isCorrect?: boolean;
  disabled?: boolean;
}

export default function ClinicalScenarioQuestion({
  question,
  value,
  onChange,
  showResult = false,
  isCorrect,
  disabled = false,
}: ClinicalScenarioQuestionProps) {
  const [currentSubQuestionIndex, setCurrentSubQuestionIndex] = useState(0);
  const subQuestions = question.options.sub_questions;

  const currentSubQuestion = subQuestions[currentSubQuestionIndex];
  const totalSubQuestions = subQuestions.length;
  const isLastSubQuestion = currentSubQuestionIndex === totalSubQuestions - 1;
  const isFirstSubQuestion = currentSubQuestionIndex === 0;

  const handleSubAnswerChange = (serializedAnswer: string) => {
    if (!currentSubQuestion) return;

    let answerFormat: AnswerFormat;

    switch (currentSubQuestion.question_type) {
      case 'multiple_choice':
        answerFormat = { type: 'multiple_choice', answer: serializedAnswer };
        break;
      case 'multi_select':
        answerFormat = { type: 'multi_select', answers: JSON.parse(serializedAnswer) };
        break;
      default:
        return;
    }

    const newSubAnswers = {
      ...value,
      [currentSubQuestion.id]: answerFormat,
    };

    onChange(newSubAnswers);
  };

  const handleNext = () => {
    if (!isLastSubQuestion) {
      setCurrentSubQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstSubQuestion) {
      setCurrentSubQuestionIndex(prev => prev - 1);
    }
  };

  if (!subQuestions || subQuestions.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No sub-questions available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.vignetteContainer}>
        <Text style={styles.vignetteLabel}>Clinical Scenario</Text>
        <Text style={styles.vignetteText}>{question.options.vignette}</Text>
      </View>

      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          Question {currentSubQuestionIndex + 1} of {totalSubQuestions}
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((currentSubQuestionIndex + 1) / totalSubQuestions) * 100}%` }
            ]}
          />
        </View>
      </View>

      {currentSubQuestion && (
        <View style={styles.subQuestionContainer}>
          <QuestionRenderer
            question={currentSubQuestion}
            onAnswerChange={handleSubAnswerChange}
            showResult={false}
            disabled={disabled}
          />
        </View>
      )}

      <View style={styles.navigationContainer}>
        <TouchableOpacity
          onPress={handlePrevious}
          disabled={isFirstSubQuestion || disabled}
          style={[
            styles.navButton,
            (isFirstSubQuestion || disabled) && styles.navButtonDisabled,
          ]}
        >
          <ChevronLeft
            size={20}
            color={(isFirstSubQuestion || disabled) ? Colors.text.disabled : Colors.primary}
          />
          <Text style={[
            styles.navButtonText,
            (isFirstSubQuestion || disabled) && styles.navButtonTextDisabled,
          ]}>
            Previous
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNext}
          disabled={isLastSubQuestion || disabled}
          style={[
            styles.navButton,
            (isLastSubQuestion || disabled) && styles.navButtonDisabled,
          ]}
        >
          <Text style={[
            styles.navButtonText,
            (isLastSubQuestion || disabled) && styles.navButtonTextDisabled,
          ]}>
            Next
          </Text>
          <ChevronRight
            size={20}
            color={(isLastSubQuestion || disabled) ? Colors.text.disabled : Colors.primary}
          />
        </TouchableOpacity>
      </View>

      {showResult && (
        <View style={styles.resultContainer}>
          <Text style={[styles.resultText, isCorrect ? styles.correctText : styles.incorrectText]}>
            {isCorrect ? 'Correct!' : 'Incorrect'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  errorContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
  },
  vignetteContainer: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  vignetteLabel: {
    ...Typography.h4,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  vignetteText: {
    ...Typography.body,
    color: Colors.text.primary,
    lineHeight: 24,
  },
  progressContainer: {
    marginBottom: Spacing.lg,
  },
  progressText: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
  },
  subQuestionContainer: {
    marginBottom: Spacing.lg,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundSecondary,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '500',
  },
  navButtonTextDisabled: {
    color: Colors.text.disabled,
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
