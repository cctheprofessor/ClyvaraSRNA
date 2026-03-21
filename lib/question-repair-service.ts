import { Question } from '@/types/question';

/**
 * Attempts to repair common issues in malformed questions
 */
export class QuestionRepairService {
  /**
   * Attempts to repair a question before rejecting it
   * Returns repaired question if successful, null if unrepairable
   */
  static repairQuestion(question: any): any | null {
    if (!question || !question.question_type) {
      return null;
    }

    let repaired = { ...question };
    let wasRepaired = false;

    switch (question.question_type) {
      case 'clinical_scenario':
        const clinicalResult = this.repairClinicalScenario(repaired);
        if (clinicalResult) {
          repaired = clinicalResult.question;
          wasRepaired = clinicalResult.wasRepaired;
        }
        break;

      case 'multi_select':
      case 'multiple_choice':
        const optionsResult = this.repairOptions(repaired);
        if (optionsResult) {
          repaired = optionsResult.question;
          wasRepaired = optionsResult.wasRepaired;
        }
        break;

      case 'drag_drop_matching':
        const matchingResult = this.repairMatching(repaired);
        if (matchingResult) {
          repaired = matchingResult.question;
          wasRepaired = matchingResult.wasRepaired;
        }
        break;

      case 'drag_drop_ordering':
        const orderingResult = this.repairOrdering(repaired);
        if (orderingResult) {
          repaired = orderingResult.question;
          wasRepaired = orderingResult.wasRepaired;
        }
        break;
    }

    return wasRepaired ? repaired : null;
  }

  /**
   * Repairs clinical scenario questions
   * Strategy 1: Keep valid sub-questions, discard broken ones
   * Strategy 2: If no valid sub-questions but has vignette, convert to multiple choice
   */
  private static repairClinicalScenario(question: any): { question: any; wasRepaired: boolean } | null {
    if (!question.options || typeof question.options !== 'object') {
      return null;
    }

    let wasRepaired = false;

    if (typeof question.options.vignette !== 'string') {
      if (question.options.vignette === '[object Object]') {
        return null;
      }
      question.options.vignette = String(question.options.vignette || '');
      wasRepaired = true;
    }

    if (!Array.isArray(question.options.sub_questions)) {
      return null;
    }

    const validSubQuestions = question.options.sub_questions.filter((subQ: any) => {
      if (!subQ.id || subQ.id === '') return false;
      if (!Array.isArray(subQ.options) || subQ.options.length === 0) return false;
      if (!subQ.correct_answer || subQ.correct_answer === '') return false;
      if (subQ.question_text === 'Question text not available') return false;

      const hasValidOptions = subQ.options.every((opt: any) =>
        opt.id && opt.text && opt.text.trim() !== ''
      );
      if (!hasValidOptions) return false;

      return true;
    });

    if (validSubQuestions.length === 0) {
      if (__DEV__) { console.log(`[QuestionRepairService] Clinical scenario ${question.id} has no valid sub-questions, cannot repair`); }
      return null;
    }

    if (validSubQuestions.length !== question.options.sub_questions.length) {
      question.options.sub_questions = validSubQuestions;
      wasRepaired = true;
      if (__DEV__) { console.log(`[QuestionRepairService] Repaired clinical scenario ${question.id} by filtering ${question.options.sub_questions.length - validSubQuestions.length} invalid sub-questions`); }
    }

    return { question, wasRepaired };
  }

  /**
   * Repairs options array (for multiple choice and multi-select)
   * Strategy: Remove placeholder options
   */
  private static repairOptions(question: any): { question: any; wasRepaired: boolean } | null {
    if (!Array.isArray(question.options)) {
      return null;
    }

    const placeholderIds = ['rationale', 'explanation', 'todo', 'tbd'];
    const placeholderTexts = ['rationale', 'explanation', 'todo', 'tbd', 'n/a', 'none'];

    const validOptions = question.options.filter((opt: any) => {
      if (!opt.id || !opt.text) return false;

      const idLower = opt.id.toLowerCase().trim();
      const textLower = opt.text.toLowerCase().trim();

      if (placeholderIds.includes(idLower)) return false;
      if (placeholderTexts.includes(textLower)) return false;

      return true;
    });

    if (validOptions.length < 2) {
      return null;
    }

    const wasRepaired = validOptions.length !== question.options.length;

    if (wasRepaired) {
      question.options = validOptions;

      if (question.question_type === 'multi_select' && Array.isArray(question.correct_answers)) {
        const validOptionIds = validOptions.map((opt: any) => opt.id);
        question.correct_answers = question.correct_answers.filter((id: string) =>
          validOptionIds.includes(id)
        );

        if (question.correct_answers.length === 0) {
          return null;
        }
      }

      if (question.question_type === 'multiple_choice') {
        const validOptionIds = validOptions.map((opt: any) => opt.id);
        if (!validOptionIds.includes(question.correct_answer)) {
          return null;
        }
      }
    }

    return { question, wasRepaired };
  }

  /**
   * Repairs drag-drop matching questions
   * Strategy: Cannot repair empty correct_pairs - too ambiguous
   */
  private static repairMatching(question: any): { question: any; wasRepaired: boolean } | null {
    if (!question.options || typeof question.options !== 'object') {
      if (__DEV__) { console.log(`[QuestionRepairService] Matching question ${question.id} has invalid options structure`); }
      return null;
    }

    if (!question.options.correct_pairs || typeof question.options.correct_pairs !== 'object') {
      if (__DEV__) { console.log(`[QuestionRepairService] Matching question ${question.id} missing correct_pairs`); }
      return null;
    }

    if (Object.keys(question.options.correct_pairs).length === 0) {
      if (__DEV__) { console.log(`[QuestionRepairService] Matching question ${question.id} has empty correct_pairs - unrepairable`); }
      return null;
    }

    if (!Array.isArray(question.options.column_a) || question.options.column_a.length === 0) {
      if (__DEV__) { console.log(`[QuestionRepairService] Matching question ${question.id} has empty column_a`); }
      return null;
    }

    if (!Array.isArray(question.options.column_b) || question.options.column_b.length === 0) {
      if (__DEV__) { console.log(`[QuestionRepairService] Matching question ${question.id} has empty column_b`); }
      return null;
    }

    return { question, wasRepaired: false };
  }

  /**
   * Repairs drag-drop ordering questions
   * Strategy: If correct_order is empty but steps exist, cannot infer order
   * Can repair if lengths mismatch slightly
   */
  private static repairOrdering(question: any): { question: any; wasRepaired: boolean } | null {
    if (!question.options || typeof question.options !== 'object') {
      if (__DEV__) { console.log(`[QuestionRepairService] Ordering question ${question.id} has invalid options structure`); }
      return null;
    }

    if (!Array.isArray(question.options.steps) || question.options.steps.length === 0) {
      if (__DEV__) { console.log(`[QuestionRepairService] Ordering question ${question.id} has no steps`); }
      return null;
    }

    if (!Array.isArray(question.options.correct_order) || question.options.correct_order.length === 0) {
      if (__DEV__) { console.log(`[QuestionRepairService] Ordering question ${question.id} has empty correct_order`); }
      return null;
    }

    const stepIds = question.options.steps.map((s: any) => s.id);
    const orderLength = question.options.correct_order.length;
    const stepsLength = stepIds.length;

    if (orderLength !== stepsLength) {
      if (__DEV__) { console.log(`[QuestionRepairService] Ordering question ${question.id} has mismatched lengths: ${orderLength} order vs ${stepsLength} steps`); }

      const validOrderIds = question.options.correct_order.filter((id: string) =>
        stepIds.includes(id)
      );

      if (validOrderIds.length === stepsLength && validOrderIds.length === orderLength) {
        return { question, wasRepaired: false };
      }

      return null;
    }

    return { question, wasRepaired: false };
  }

  /**
   * Determines if a failed question is worth retrying
   * Some failures indicate the ML backend might succeed on retry
   */
  static shouldRetry(errors: string[]): boolean {
    const errorText = errors.join(' ').toLowerCase();

    const retryablePatterns = [
      'empty correct_pairs',
      'empty correct_order',
      'placeholder text',
      'vignette',
    ];

    return retryablePatterns.some(pattern => errorText.includes(pattern));
  }

  /**
   * Gets a user-friendly explanation of what went wrong
   */
  static getFailureReason(errors: string[]): string {
    const errorText = errors.join(' ');

    if (errorText.includes('Sub-question')) {
      return 'Clinical scenario had incomplete questions';
    } else if (errorText.includes('correct_pairs')) {
      return 'Matching question missing answer key';
    } else if (errorText.includes('correct_order')) {
      return 'Ordering question missing sequence';
    } else if (errorText.includes('placeholder text')) {
      return 'Question contained placeholder text';
    } else if (errorText.includes('missing')) {
      return 'Question missing required information';
    } else {
      return 'Question format was invalid';
    }
  }

  /**
   * Analyzes rejected questions and returns a summary
   */
  static getrejectionSummary(rejectedQuestions: Array<{ question: any; errors: string[] }>): {
    total: number;
    byType: Record<string, number>;
    byReason: Record<string, number>;
  } {
    const summary = {
      total: rejectedQuestions.length,
      byType: {} as Record<string, number>,
      byReason: {} as Record<string, number>,
    };

    rejectedQuestions.forEach(({ question, errors }) => {
      const type = question.question_type || 'unknown';
      summary.byType[type] = (summary.byType[type] || 0) + 1;

      const reason = this.getFailureReason(errors);
      summary.byReason[reason] = (summary.byReason[reason] || 0) + 1;
    });

    return summary;
  }

  /**
   * Pre-filters obviously broken questions before validation/repair
   * Returns an object with shouldKeep boolean and reason string
   *
   * PHILOSOPHY:
   * - This runs BEFORE transformQuestion(), so be lenient with FORMAT issues
   * - Accept both array and object formats for options (transformer handles both)
   * - Accept different field names (id vs question_id, question_text vs question)
   * - But reject questions missing truly REQUIRED data (correct answers, IDs, etc)
   * - Let the transformer and repair service handle fixable formatting issues
   */
  static preFilter(question: any): { shouldKeep: boolean; reason?: string } {
    if (!question || !question.question_type) {
      return { shouldKeep: false, reason: 'Missing question or question_type' };
    }

    const hasQuestionId = !!(question.id || question.question_id);
    if (!hasQuestionId) {
      return { shouldKeep: false, reason: 'Missing question ID (id or question_id field)' };
    }

    const hasQuestionText = !!(question.question_text || question.question);
    if (!hasQuestionText) {
      return { shouldKeep: false, reason: 'Missing question text (question_text or question field)' };
    }

    switch (question.question_type) {
      case 'clinical_scenario':
        if (!question.options?.sub_questions || !Array.isArray(question.options.sub_questions)) {
          return { shouldKeep: false, reason: 'Missing or invalid options.sub_questions array' };
        }
        if (question.options.sub_questions.length === 0) {
          return { shouldKeep: false, reason: 'Empty options.sub_questions array' };
        }
        break;

      case 'drag_drop_matching':
        if (!question.options || typeof question.options !== 'object') {
          return { shouldKeep: false, reason: 'Missing or invalid options object' };
        }
        if (!question.options.correct_pairs || typeof question.options.correct_pairs !== 'object') {
          return { shouldKeep: false, reason: 'Missing or invalid options.correct_pairs object' };
        }
        if (Object.keys(question.options.correct_pairs).length === 0) {
          return { shouldKeep: false, reason: 'Empty options.correct_pairs object - need answer key mapping' };
        }
        break;

      case 'drag_drop_ordering':
        if (!question.options || typeof question.options !== 'object') {
          return { shouldKeep: false, reason: 'Missing or invalid options object' };
        }
        const hasSteps = Array.isArray(question.options.steps) && question.options.steps.length > 0;
        const hasCorrectOrder = Array.isArray(question.options.correct_order) && question.options.correct_order.length > 0;
        if (!hasSteps) {
          return { shouldKeep: false, reason: 'Missing or empty options.steps array' };
        }
        if (!hasCorrectOrder) {
          return { shouldKeep: false, reason: 'Missing or empty options.correct_order array - need correct sequence' };
        }
        break;

      case 'multiple_choice':
        const hasOptions = question.options && (
          Array.isArray(question.options) ||
          (typeof question.options === 'object' && Object.keys(question.options).length >= 2)
        );
        if (!hasOptions) {
          return { shouldKeep: false, reason: 'Missing options or less than 2 options provided' };
        }
        if (!question.correct_answer && question.correct_answer !== 0) {
          return { shouldKeep: false, reason: 'Missing correct_answer field' };
        }
        break;

      case 'multi_select':
        const hasMultiOptions = question.options && (
          Array.isArray(question.options) ||
          (typeof question.options === 'object' && Object.keys(question.options).length >= 2)
        );
        if (!hasMultiOptions) {
          return { shouldKeep: false, reason: 'Missing options or less than 2 options provided' };
        }
        if (!Array.isArray(question.correct_answers) || question.correct_answers.length === 0) {
          return { shouldKeep: false, reason: 'Missing or empty correct_answers array' };
        }
        break;
    }

    return { shouldKeep: true };
  }
}
