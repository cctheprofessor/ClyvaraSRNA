// Comprehensive question type definitions for ML backend integration

export type QuestionType =
  | 'multiple_choice'
  | 'multi_select'
  | 'drag_drop_matching'
  | 'drag_drop_ordering'
  | 'clinical_scenario'
  | 'hotspot';

// Base question interface
interface BaseQuestion {
  id: string;
  question_text: string;
  explanation?: string;
  rationale?: string;
  topic_id?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

// Multiple choice question
export interface MultipleChoiceQuestion extends BaseQuestion {
  question_type: 'multiple_choice';
  options: Array<{ id: string; text: string }>;
  correct_answer: string;
}

// Multi-select question
export interface MultiSelectQuestion extends BaseQuestion {
  question_type: 'multi_select';
  options: Array<{ id: string; text: string }>;
  correct_answers: string[];
  min_selections?: number;
  max_selections?: number;
}

// Drag and drop matching question
export interface DragDropMatchingQuestion extends BaseQuestion {
  question_type: 'drag_drop_matching';
  options: {
    column_a: Array<{ id: string; text: string }>;
    column_b: Array<{ id: string; text: string }>;
    correct_pairs: Record<string, string>; // { a_id: b_id }
  };
}

// Drag and drop ordering question
export interface DragDropOrderingQuestion extends BaseQuestion {
  question_type: 'drag_drop_ordering';
  options: {
    steps: Array<{ id: string; text: string }>;
    correct_order: string[]; // Array of IDs in correct order
  };
}

// Clinical scenario question with sub-questions
export interface ClinicalScenarioQuestion extends BaseQuestion {
  question_type: 'clinical_scenario';
  options: {
    vignette: string; // The clinical scenario text
    sub_questions: Question[]; // Array of full sub-question objects
  };
}

// Hotspot question (image with clickable zones)
export interface HotspotQuestion extends BaseQuestion {
  question_type: 'hotspot';
  options: {
    image_url: string;
    hotspot_zones: Array<{
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      is_correct: boolean;
    }>;
  };
}

// Union type for all question types
export type Question =
  | MultipleChoiceQuestion
  | MultiSelectQuestion
  | DragDropMatchingQuestion
  | DragDropOrderingQuestion
  | ClinicalScenarioQuestion
  | HotspotQuestion;

// Answer format types
export type AnswerFormat =
  | { type: 'multiple_choice'; answer: string }
  | { type: 'multi_select'; answers: string[] }
  | { type: 'drag_drop_matching'; pairs: Record<string, string> }
  | { type: 'drag_drop_ordering'; order: string[] }
  | { type: 'clinical_scenario'; sub_answers: Record<string, AnswerFormat> }
  | { type: 'hotspot'; zone_id: string };

// Helper function to serialize answer for API submission
export function serializeAnswer(answer: AnswerFormat): string {
  switch (answer.type) {
    case 'multiple_choice':
      return answer.answer;
    case 'multi_select':
      return JSON.stringify(answer.answers);
    case 'drag_drop_matching':
      return JSON.stringify(answer.pairs);
    case 'drag_drop_ordering':
      return JSON.stringify(answer.order);
    case 'clinical_scenario':
      return JSON.stringify(answer.sub_answers);
    case 'hotspot':
      return answer.zone_id;
    default:
      return '';
  }
}
