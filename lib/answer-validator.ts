import type { Question, AnswerFormat } from '@/types/question';

export interface ValidationResult {
  is_correct: boolean;
  correct_answer?: string;
  correct_answers?: string[];
  correct_pairs?: Record<string, string>;
  correct_order?: string[];
  explanation?: string;
  rationale?: string;
}

export function validateAnswer(question: Question, userAnswer: AnswerFormat): ValidationResult {
  const baseResult: ValidationResult = {
    is_correct: false,
    explanation: question.explanation,
    rationale: question.rationale,
  };

  switch (question.question_type) {
    case 'multiple_choice': {
      if (userAnswer.type !== 'multiple_choice') {
        return baseResult;
      }
      const isCorrect = userAnswer.answer === question.correct_answer;
      return {
        ...baseResult,
        is_correct: isCorrect,
        correct_answer: question.correct_answer,
      };
    }

    case 'multi_select': {
      if (userAnswer.type !== 'multi_select') {
        return baseResult;
      }
      const userAnswers = [...userAnswer.answers].sort();
      const correctAnswers = [...question.correct_answers].sort();
      const isCorrect =
        userAnswers.length === correctAnswers.length &&
        userAnswers.every((ans, idx) => ans === correctAnswers[idx]);
      return {
        ...baseResult,
        is_correct: isCorrect,
        correct_answers: question.correct_answers,
      };
    }

    case 'drag_drop_matching': {
      if (userAnswer.type !== 'drag_drop_matching') {
        return baseResult;
      }
      const correctPairs = question.options.correct_pairs;
      const userPairs = userAnswer.pairs;

      const correctKeys = Object.keys(correctPairs).sort();
      const userKeys = Object.keys(userPairs).sort();

      const isCorrect =
        correctKeys.length === userKeys.length &&
        correctKeys.every(key => userPairs[key] === correctPairs[key]);

      return {
        ...baseResult,
        is_correct: isCorrect,
        correct_pairs: correctPairs,
      };
    }

    case 'drag_drop_ordering': {
      if (userAnswer.type !== 'drag_drop_ordering') {
        return baseResult;
      }
      const correctOrder = question.options.correct_order;
      const userOrder = userAnswer.order;

      const isCorrect =
        correctOrder.length === userOrder.length &&
        correctOrder.every((id, idx) => id === userOrder[idx]);

      return {
        ...baseResult,
        is_correct: isCorrect,
        correct_order: correctOrder,
      };
    }

    case 'hotspot': {
      if (userAnswer.type !== 'hotspot') {
        return baseResult;
      }
      const selectedZone = question.options.hotspot_zones.find(
        zone => zone.id === userAnswer.zone_id
      );
      return {
        ...baseResult,
        is_correct: selectedZone?.is_correct || false,
      };
    }

    case 'clinical_scenario': {
      if (userAnswer.type !== 'clinical_scenario') {
        return baseResult;
      }

      let allCorrect = true;
      for (const subQuestion of question.options.sub_questions) {
        const subAnswer = userAnswer.sub_answers[subQuestion.id];
        if (!subAnswer) {
          allCorrect = false;
          break;
        }
        const subResult = validateAnswer(subQuestion, subAnswer);
        if (!subResult.is_correct) {
          allCorrect = false;
          break;
        }
      }

      return {
        ...baseResult,
        is_correct: allCorrect,
      };
    }

    default:
      return baseResult;
  }
}
