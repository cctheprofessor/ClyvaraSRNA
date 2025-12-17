import { Question, QuestionType } from '@/types/question';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates a question to ensure it has all required fields and proper structure
 */
export function validateQuestion(question: any): ValidationResult {
  const errors: string[] = [];

  // Check for basic required fields
  if (!question) {
    return { isValid: false, errors: ['Question is null or undefined'] };
  }

  if (!question.id || typeof question.id !== 'string') {
    errors.push('Missing or invalid question ID');
  }

  if (!question.question_text || typeof question.question_text !== 'string' || question.question_text.trim() === '') {
    errors.push('Missing or invalid question text');
  }

  if (!question.question_type || typeof question.question_type !== 'string') {
    errors.push('Missing or invalid question type');
  }

  // Validate based on question type
  const questionType = question.question_type as QuestionType;

  switch (questionType) {
    case 'multiple_choice':
      validateMultipleChoice(question, errors);
      break;
    case 'multi_select':
      validateMultiSelect(question, errors);
      break;
    case 'drag_drop_matching':
      validateDragDropMatching(question, errors);
      break;
    case 'drag_drop_ordering':
      validateDragDropOrdering(question, errors);
      break;
    case 'clinical_scenario':
      validateClinicalScenario(question, errors);
      break;
    case 'hotspot':
      validateHotspot(question, errors);
      break;
    default:
      errors.push(`Unknown question type: ${question.question_type}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function validateMultipleChoice(question: any, errors: string[]): void {
  if (!Array.isArray(question.options)) {
    errors.push('Multiple choice question missing options array');
    return;
  }

  if (question.options.length < 2) {
    errors.push('Multiple choice question must have at least 2 options');
  }

  // Validate each option has id and text
  question.options.forEach((option: any, index: number) => {
    if (!option.id || typeof option.id !== 'string') {
      errors.push(`Option ${index + 1} missing or invalid ID`);
    }
    if (!option.text || typeof option.text !== 'string' || option.text.trim() === '') {
      errors.push(`Option ${index + 1} missing or invalid text`);
    }
  });

  if (!question.correct_answer || typeof question.correct_answer !== 'string') {
    errors.push('Multiple choice question missing correct answer');
  } else {
    // Verify correct_answer matches one of the option IDs
    const optionIds = question.options.map((opt: any) => opt.id);
    if (!optionIds.includes(question.correct_answer)) {
      errors.push('Correct answer does not match any option ID');
    }
  }
}

function validateMultiSelect(question: any, errors: string[]): void {
  if (!Array.isArray(question.options)) {
    errors.push('Multi-select question missing options array');
    return;
  }

  if (question.options.length < 2) {
    errors.push('Multi-select question must have at least 2 options');
  }

  // Validate each option has id and text
  question.options.forEach((option: any, index: number) => {
    if (!option.id || typeof option.id !== 'string') {
      errors.push(`Option ${index + 1} missing or invalid ID`);
    }
    if (!option.text || typeof option.text !== 'string' || option.text.trim() === '') {
      errors.push(`Option ${index + 1} missing or invalid text`);
    }
  });

  if (!Array.isArray(question.correct_answers)) {
    errors.push('Multi-select question missing correct_answers array');
  } else {
    if (question.correct_answers.length === 0) {
      errors.push('Multi-select question must have at least one correct answer');
    }

    // Verify all correct answers match option IDs
    const optionIds = question.options.map((opt: any) => opt.id);
    question.correct_answers.forEach((answerId: any) => {
      if (!optionIds.includes(answerId)) {
        errors.push(`Correct answer ${answerId} does not match any option ID`);
      }
    });
  }
}

function validateDragDropMatching(question: any, errors: string[]): void {
  if (!question.options || typeof question.options !== 'object') {
    errors.push('Drag-drop matching question missing options object');
    return;
  }

  if (!Array.isArray(question.options.column_a)) {
    errors.push('Drag-drop matching question missing column_a array');
  } else if (question.options.column_a.length === 0) {
    errors.push('Drag-drop matching question column_a must have at least one item');
  }

  if (!Array.isArray(question.options.column_b)) {
    errors.push('Drag-drop matching question missing column_b array');
  } else if (question.options.column_b.length === 0) {
    errors.push('Drag-drop matching question column_b must have at least one item');
  }

  // Validate column items
  if (Array.isArray(question.options.column_a)) {
    question.options.column_a.forEach((item: any, index: number) => {
      if (!item.id || typeof item.id !== 'string') {
        errors.push(`Column A item ${index + 1} missing or invalid ID`);
      }
      if (!item.text || typeof item.text !== 'string' || item.text.trim() === '') {
        errors.push(`Column A item ${index + 1} missing or invalid text`);
      }
    });
  }

  if (Array.isArray(question.options.column_b)) {
    question.options.column_b.forEach((item: any, index: number) => {
      if (!item.id || typeof item.id !== 'string') {
        errors.push(`Column B item ${index + 1} missing or invalid ID`);
      }
      if (!item.text || typeof item.text !== 'string' || item.text.trim() === '') {
        errors.push(`Column B item ${index + 1} missing or invalid text`);
      }
    });
  }

  if (!question.options.correct_pairs || typeof question.options.correct_pairs !== 'object') {
    errors.push('Drag-drop matching question missing correct_pairs object');
  } else if (Object.keys(question.options.correct_pairs).length === 0) {
    errors.push('Drag-drop matching question must have at least one correct pair');
  }
}

function validateDragDropOrdering(question: any, errors: string[]): void {
  if (!question.options || typeof question.options !== 'object') {
    errors.push('Drag-drop ordering question missing options object');
    return;
  }

  if (!Array.isArray(question.options.steps)) {
    errors.push('Drag-drop ordering question missing steps array');
  } else if (question.options.steps.length < 2) {
    errors.push('Drag-drop ordering question must have at least 2 steps');
  } else {
    // Validate each step has id and text
    question.options.steps.forEach((step: any, index: number) => {
      if (!step.id || typeof step.id !== 'string') {
        errors.push(`Step ${index + 1} missing or invalid ID`);
      }
      if (!step.text || typeof step.text !== 'string' || step.text.trim() === '') {
        errors.push(`Step ${index + 1} missing or invalid text`);
      }
    });
  }

  if (!Array.isArray(question.options.correct_order)) {
    errors.push('Drag-drop ordering question missing correct_order array');
  } else if (question.options.correct_order.length !== question.options.steps?.length) {
    errors.push('Correct order length must match steps length');
  } else {
    // Verify all IDs in correct_order match step IDs
    const stepIds = question.options.steps?.map((step: any) => step.id) || [];
    question.options.correct_order.forEach((stepId: any) => {
      if (!stepIds.includes(stepId)) {
        errors.push(`Correct order contains invalid step ID: ${stepId}`);
      }
    });
  }
}

function validateClinicalScenario(question: any, errors: string[]): void {
  if (!question.options || typeof question.options !== 'object') {
    errors.push('Clinical scenario question missing options object');
    return;
  }

  if (!question.options.vignette || typeof question.options.vignette !== 'string' || question.options.vignette.trim() === '') {
    errors.push('Clinical scenario question missing vignette text');
  }

  if (!Array.isArray(question.options.sub_questions)) {
    errors.push('Clinical scenario question missing sub_questions array');
  } else if (question.options.sub_questions.length === 0) {
    errors.push('Clinical scenario question must have at least one sub-question');
  } else {
    // Recursively validate each sub-question
    question.options.sub_questions.forEach((subQuestion: any, index: number) => {
      const subValidation = validateQuestion(subQuestion);
      if (!subValidation.isValid) {
        subValidation.errors.forEach(error => {
          errors.push(`Sub-question ${index + 1}: ${error}`);
        });
      }
    });
  }
}

function validateHotspot(question: any, errors: string[]): void {
  if (!question.options || typeof question.options !== 'object') {
    errors.push('Hotspot question missing options object');
    return;
  }

  if (!question.options.image_url || typeof question.options.image_url !== 'string' || question.options.image_url.trim() === '') {
    errors.push('Hotspot question missing image_url');
  }

  if (!Array.isArray(question.options.hotspot_zones)) {
    errors.push('Hotspot question missing hotspot_zones array');
  } else if (question.options.hotspot_zones.length === 0) {
    errors.push('Hotspot question must have at least one hotspot zone');
  } else {
    // Validate each zone
    let hasCorrectZone = false;
    question.options.hotspot_zones.forEach((zone: any, index: number) => {
      if (!zone.id || typeof zone.id !== 'string') {
        errors.push(`Hotspot zone ${index + 1} missing or invalid ID`);
      }
      if (typeof zone.x !== 'number') {
        errors.push(`Hotspot zone ${index + 1} missing or invalid x coordinate`);
      }
      if (typeof zone.y !== 'number') {
        errors.push(`Hotspot zone ${index + 1} missing or invalid y coordinate`);
      }
      if (typeof zone.width !== 'number' || zone.width <= 0) {
        errors.push(`Hotspot zone ${index + 1} missing or invalid width`);
      }
      if (typeof zone.height !== 'number' || zone.height <= 0) {
        errors.push(`Hotspot zone ${index + 1} missing or invalid height`);
      }
      if (typeof zone.is_correct !== 'boolean') {
        errors.push(`Hotspot zone ${index + 1} missing or invalid is_correct flag`);
      } else if (zone.is_correct) {
        hasCorrectZone = true;
      }
    });

    if (!hasCorrectZone) {
      errors.push('Hotspot question must have at least one correct zone');
    }
  }
}

/**
 * Filters an array of questions, keeping only valid ones
 * Returns both valid questions and rejected question info
 */
export function filterValidQuestions(questions: any[]): {
  validQuestions: Question[];
  rejectedQuestions: Array<{ question: any; errors: string[] }>;
} {
  const validQuestions: Question[] = [];
  const rejectedQuestions: Array<{ question: any; errors: string[] }> = [];

  questions.forEach((question) => {
    const validation = validateQuestion(question);
    if (validation.isValid) {
      validQuestions.push(question as Question);
    } else {
      rejectedQuestions.push({
        question,
        errors: validation.errors,
      });
    }
  });

  return { validQuestions, rejectedQuestions };
}
