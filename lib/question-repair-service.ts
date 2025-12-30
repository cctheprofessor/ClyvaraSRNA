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
      console.log(`[QuestionRepairService] Clinical scenario ${question.id} has no valid sub-questions, cannot repair`);
      return null;
    }

    if (validSubQuestions.length !== question.options.sub_questions.length) {
      question.options.sub_questions = validSubQuestions;
      wasRepaired = true;
      console.log(`[QuestionRepairService] Repaired clinical scenario ${question.id} by filtering ${question.options.sub_questions.length - validSubQuestions.length} invalid sub-questions`);
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
      console.log(`[QuestionRepairService] Matching question ${question.id} has invalid options structure`);
      return null;
    }

    if (!question.options.correct_pairs || typeof question.options.correct_pairs !== 'object') {
      console.log(`[QuestionRepairService] Matching question ${question.id} missing correct_pairs`);
      return null;
    }

    if (Object.keys(question.options.correct_pairs).length === 0) {
      console.log(`[QuestionRepairService] Matching question ${question.id} has empty correct_pairs - unrepairable`);
      return null;
    }

    if (!Array.isArray(question.options.column_a) || question.options.column_a.length === 0) {
      console.log(`[QuestionRepairService] Matching question ${question.id} has empty column_a`);
      return null;
    }

    if (!Array.isArray(question.options.column_b) || question.options.column_b.length === 0) {
      console.log(`[QuestionRepairService] Matching question ${question.id} has empty column_b`);
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
      console.log(`[QuestionRepairService] Ordering question ${question.id} has invalid options structure`);
      return null;
    }

    if (!Array.isArray(question.options.steps) || question.options.steps.length === 0) {
      console.log(`[QuestionRepairService] Ordering question ${question.id} has no steps`);
      return null;
    }

    if (!Array.isArray(question.options.correct_order) || question.options.correct_order.length === 0) {
      console.log(`[QuestionRepairService] Ordering question ${question.id} has empty correct_order`);
      return null;
    }

    const stepIds = question.options.steps.map((s: any) => s.id);
    const orderLength = question.options.correct_order.length;
    const stepsLength = stepIds.length;

    if (orderLength !== stepsLength) {
      console.log(`[QuestionRepairService] Ordering question ${question.id} has mismatched lengths: ${orderLength} order vs ${stepsLength} steps`);

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
   * Returns true if question should be kept, false if it should be rejected
   */
  static preFilter(question: any): boolean {
    if (!question || !question.id || !question.question_type) {
      return false;
    }

    switch (question.question_type) {
      case 'clinical_scenario':
        if (!question.options?.sub_questions || !Array.isArray(question.options.sub_questions)) {
          return false;
        }
        if (question.options.sub_questions.length === 0) {
          return false;
        }
        break;

      case 'drag_drop_matching':
        if (!question.options?.correct_pairs || typeof question.options.correct_pairs !== 'object') {
          return false;
        }
        if (Object.keys(question.options.correct_pairs).length === 0) {
          return false;
        }
        if (!Array.isArray(question.options?.column_a) || question.options.column_a.length === 0) {
          return false;
        }
        if (!Array.isArray(question.options?.column_b) || question.options.column_b.length === 0) {
          return false;
        }
        break;

      case 'drag_drop_ordering':
        if (!Array.isArray(question.options?.steps) || question.options.steps.length === 0) {
          return false;
        }
        if (!Array.isArray(question.options?.correct_order) || question.options.correct_order.length === 0) {
          return false;
        }
        break;

      case 'multiple_choice':
        if (!Array.isArray(question.options) || question.options.length < 2) {
          return false;
        }
        if (!question.correct_answer) {
          return false;
        }
        break;

      case 'multi_select':
        if (!Array.isArray(question.options) || question.options.length < 2) {
          return false;
        }
        if (!Array.isArray(question.correct_answers) || question.correct_answers.length === 0) {
          return false;
        }
        break;
    }

    return true;
  }
}
