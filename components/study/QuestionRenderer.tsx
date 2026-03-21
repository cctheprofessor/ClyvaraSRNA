import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { Question, AnswerFormat, serializeAnswer } from '@/types/question';
import MultipleChoiceQuestion from './MultipleChoiceQuestion';
import MultiSelectQuestion from './MultiSelectQuestion';
import DragDropMatchingQuestion from './DragDropMatchingQuestion';
import DragDropOrderingQuestion from './DragDropOrderingQuestion';
import ClinicalScenarioQuestion from './ClinicalScenarioQuestion';
import HotspotQuestion from './HotspotQuestion';
import RationaleDisplay from './RationaleDisplay';

interface QuestionRendererProps {
  question: Question;
  onAnswerChange: (serializedAnswer: string) => void;
  showResult?: boolean;
  isCorrect?: boolean;
  disabled?: boolean;
  rationale?: string;
  optionRationales?: Record<string, string>;
  correctAnswers?: string[];
  rationaleLoading?: boolean;
}

export default function QuestionRenderer({
  question,
  onAnswerChange,
  showResult = false,
  isCorrect,
  disabled = false,
  rationale,
  optionRationales,
  correctAnswers,
  rationaleLoading = false,
}: QuestionRendererProps) {
  const [multipleChoiceValue, setMultipleChoiceValue] = useState<string | null>(null);
  const [multiSelectValue, setMultiSelectValue] = useState<string[]>([]);
  const [dragDropMatchingValue, setDragDropMatchingValue] = useState<Record<string, string>>({});
  const [dragDropOrderingValue, setDragDropOrderingValue] = useState<string[]>([]);
  const [clinicalScenarioValue, setClinicalScenarioValue] = useState<Record<string, AnswerFormat>>({});
  const [hotspotValue, setHotspotValue] = useState<string | null>(null);

  useEffect(() => {
    setMultipleChoiceValue(null);
    setMultiSelectValue([]);
    setDragDropMatchingValue({});
    setDragDropOrderingValue([]);
    setClinicalScenarioValue({});
    setHotspotValue(null);
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

  const handleDragDropMatchingChange = (pairs: Record<string, string>) => {
    setDragDropMatchingValue(pairs);
    const answer: AnswerFormat = { type: 'drag_drop_matching', pairs };
    onAnswerChange(serializeAnswer(answer));
  };

  const handleDragDropOrderingChange = (order: string[]) => {
    setDragDropOrderingValue(order);
    const answer: AnswerFormat = { type: 'drag_drop_ordering', order };
    onAnswerChange(serializeAnswer(answer));
  };

  const handleClinicalScenarioChange = (subAnswers: Record<string, AnswerFormat>) => {
    setClinicalScenarioValue(subAnswers);
    const answer: AnswerFormat = { type: 'clinical_scenario', sub_answers: subAnswers };
    onAnswerChange(serializeAnswer(answer));
  };

  const handleHotspotChange = (zoneId: string) => {
    setHotspotValue(zoneId);
    const answer: AnswerFormat = { type: 'hotspot', zone_id: zoneId };
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
        return (
          <DragDropMatchingQuestion
            question={question}
            value={dragDropMatchingValue}
            onChange={handleDragDropMatchingChange}
            showResult={showResult}
            isCorrect={isCorrect}
            disabled={disabled}
          />
        );

      case 'drag_drop_ordering':
        return (
          <DragDropOrderingQuestion
            question={question}
            value={dragDropOrderingValue}
            onChange={handleDragDropOrderingChange}
            showResult={showResult}
            isCorrect={isCorrect}
            disabled={disabled}
          />
        );

      case 'clinical_scenario':
        return (
          <ClinicalScenarioQuestion
            question={question}
            value={clinicalScenarioValue}
            onChange={handleClinicalScenarioChange}
            showResult={showResult}
            isCorrect={isCorrect}
            disabled={disabled}
          />
        );

      case 'hotspot':
        return (
          <HotspotQuestion
            question={question}
            value={hotspotValue}
            onChange={handleHotspotChange}
            showResult={showResult}
            isCorrect={isCorrect}
            disabled={disabled}
          />
        );

      default:
        return (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Unknown question type</Text>
          </View>
        );
    }
  };

  if (__DEV__) {
  console.log('[QuestionRenderer] Rendering question:', {
    id: question.id,
    type: question.question_type,
    hasQuestionText: !!question.question_text,
    questionTextLength: question.question_text?.length,
    questionText: question.question_text?.substring(0, 100),
    showResult,
    isCorrect,
  });
  }

  return (
    <View style={styles.container}>
      {question.question_text ? (
        <Text style={styles.questionText}>{question.question_text}</Text>
      ) : (
        <Text style={[styles.questionText, { color: Colors.error }]}>
          [No question text available]
        </Text>
      )}
      <View style={styles.contentContainer}>{renderQuestionContent()}</View>

      {showResult && isCorrect !== undefined && (
        <RationaleDisplay
          rationale={rationale || question.explanation || question.rationale}
          optionRationales={optionRationales}
          correctAnswers={correctAnswers}
          isCorrect={isCorrect}
          loading={rationaleLoading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
    minHeight: 200,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
    lineHeight: 24,
    marginBottom: Spacing.sm,
  },
  contentContainer: {
    gap: Spacing.md,
  },
  errorContainer: {
    backgroundColor: Colors.errorLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
  },
});
