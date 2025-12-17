import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { Question, AnswerFormat, serializeAnswer } from '@/types/question';
import MultipleChoiceQuestion from './MultipleChoiceQuestion';
import MultiSelectQuestion from './MultiSelectQuestion';
import UnsupportedQuestion from './UnsupportedQuestion';

interface QuestionRendererProps {
  question: Question;
  onAnswerChange: (serializedAnswer: string) => void;
  showResult?: boolean;
  isCorrect?: boolean;
  disabled?: boolean;
}

export default function QuestionRenderer({
  question,
  onAnswerChange,
  showResult = false,
  isCorrect,
  disabled = false,
}: QuestionRendererProps) {
  const [multipleChoiceValue, setMultipleChoiceValue] = useState<string | null>(null);
  const [multiSelectValue, setMultiSelectValue] = useState<string[]>([]);

  useEffect(() => {
    setMultipleChoiceValue(null);
    setMultiSelectValue([]);
  }, [question.id]);

  const handleMultipleChoiceChange = (value: string) => {
    setMultipleChoiceValue(value);
    const answer: AnswerFormat = { type: 'multiple_choice', answer: value };
    onAnswerChange(serializeAnswer(answer));
  };

  const handleMultiSelectChange = (value: string[]) => {
    setMultiSelectValue(value);
    const answer: AnswerFormat = { type: 'multi_select', answers: value };
    onAnswerChange(serializeAnswer(answer));
  };

  const renderQuestionContent = () => {
    switch (question.question_type) {
      case 'multiple_choice':
        return (
          <MultipleChoiceQuestion
            question={question}
            value={multipleChoiceValue}
            onChange={handleMultipleChoiceChange}
            showResult={showResult}
            isCorrect={isCorrect}
            disabled={disabled}
          />
        );

      case 'multi_select':
        return (
          <MultiSelectQuestion
            question={question}
            value={multiSelectValue}
            onChange={handleMultiSelectChange}
            showResult={showResult}
            isCorrect={isCorrect}
            disabled={disabled}
          />
        );

      case 'drag_drop_matching':
        return <UnsupportedQuestion questionType="drag & drop matching" />;

      case 'drag_drop_ordering':
        return <UnsupportedQuestion questionType="drag & drop ordering" />;

      case 'clinical_scenario':
        return <UnsupportedQuestion questionType="clinical scenario" />;

      case 'hotspot':
        return <UnsupportedQuestion questionType="hotspot" />;

      default:
        return <UnsupportedQuestion questionType="unknown" />;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.questionText}>{question.question_text}</Text>
      <View style={styles.contentContainer}>{renderQuestionContent()}</View>
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
  contentContainer: {
    gap: Spacing.md,
  },
});
