import { supabase } from './supabase';
import { Question, QuestionType } from '../types/question';
import { validateQuestion, filterValidQuestions } from './question-validator';
import { QuestionRepairService } from './question-repair-service';
import { DiagnosticRequiredError, MLBackendError } from '../types/errors';
import nceTopics from '../constants/nce_topics_flattened.json';

const EDGE_FUNCTION_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
  ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ml-backend-proxy`
  : '';

interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

export class MLBackendClient {
  private rateLimitInfo: RateLimitInfo | null = null;

  private async getAuthHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    retryOptions: RetryOptions = { maxRetries: 3, initialDelay: 1000 }
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retryOptions.maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);

        this.updateRateLimitInfo(response);

        if (response.status === 429) {
          const resetTime = this.rateLimitInfo?.reset || Date.now() + 60000;
          const waitTime = resetTime - Date.now();

          if (attempt < retryOptions.maxRetries - 1) {
            await this.delay(waitTime);
            continue;
          }
        }

        if (response.status >= 500 && attempt < retryOptions.maxRetries - 1) {
          await this.delay(retryOptions.initialDelay * Math.pow(2, attempt));
          continue;
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        if (attempt < retryOptions.maxRetries - 1) {
          await this.delay(retryOptions.initialDelay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  private updateRateLimitInfo(response: Response) {
    const limit = response.headers.get('X-RateLimit-Limit');
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');

    if (limit && remaining && reset) {
      this.rateLimitInfo = {
        limit: parseInt(limit),
        remaining: parseInt(remaining),
        reset: parseInt(reset) * 1000,
      };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async syncUser(userData: {
    external_user_id: string;
    email: string;
    username?: string;
    enrollment_date: string;
    program_name?: string;
    institution: string;
    expected_graduation?: string;
  }): Promise<{ user_id: number }> {
    if (__DEV__) { console.log('[MLBackendClient] Calling syncUser API with data:', userData); }
    const headers = await this.getAuthHeaders();
    const response = await this.fetchWithRetry(
      `${EDGE_FUNCTION_URL}?action=sync_user`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(userData),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      if (__DEV__) { console.error('[MLBackendClient] Sync user API failed:', errorData); }
      throw new Error(errorData.error || `Failed to sync user: ${response.statusText}`);
    }

    const result = await response.json();
    if (__DEV__) { console.log('[MLBackendClient] Sync user API response:', result); }
    return result;
  }

  async batchSyncUsers(users: Array<{
    external_user_id: string;
    email: string;
    username?: string;
    enrollment_date: string;
    program_name?: string;
    institution: string;
    expected_graduation?: string;
  }>): Promise<{
    total_synced: number;
    successful: number;
    failed: number;
    errors: Array<{ external_user_id: string; error: string }>;
  }> {
    const headers = await this.getAuthHeaders();
    const response = await this.fetchWithRetry(
      `${EDGE_FUNCTION_URL}?action=batch_sync_users`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ users }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Failed to batch sync users: ${response.statusText}`);
    }

    return await response.json();
  }

  async getUserProgression(userId: number): Promise<{
    current_stage: string;
    performance_tier: string;
    months_since_enrollment: number;
  }> {
    const headers = await this.getAuthHeaders();
    const response = await this.fetchWithRetry(
      `${EDGE_FUNCTION_URL}?action=get_progression&ml_user_id=${userId}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Failed to get user progression: ${response.statusText}`);
    }

    return await response.json();
  }

  async getNextQuestions(
    userId: number,
    limit: number = 25,
    topicId?: string
  ): Promise<Question[]> {
    const headers = await this.getAuthHeaders();
    const params = new URLSearchParams({
      action: 'get_questions',
      ml_user_id: userId.toString(),
      limit: limit.toString(),
    });

    if (topicId) {
      params.append('topic_id', topicId);
    }

    const response = await this.fetchWithRetry(
      `${EDGE_FUNCTION_URL}?${params}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      const errorMessage = errorData.error || errorData.message || response.statusText;

      if (response.status === 403 &&
          (errorMessage.toLowerCase().includes('diagnostic') ||
           errorMessage.toLowerCase().includes('exam must be completed'))) {
        throw new DiagnosticRequiredError(errorMessage);
      }

      throw new MLBackendError(
        errorMessage || 'Failed to get questions',
        response.status,
        errorData
      );
    }

    const data = await response.json();
    const questions = data.questions || [];

    const preFilteredQuestions = questions.filter((q: any) => {
      const result = QuestionRepairService.preFilter(q);
      if (!result.shouldKeep) {
        if (__DEV__) { console.log(`[MLBackendClient] PRE-FILTERED question ${q.question_id || q.id} (type: ${q.question_type}): ${result.reason}`); }
      }
      return result.shouldKeep;
    });

    const transformedQuestions = preFilteredQuestions.map((q: any) => this.transformQuestion(q));

    const { validQuestions, rejectedQuestions } = filterValidQuestions(transformedQuestions);

    const repairedQuestions: Question[] = [];
    const repairedMetadata: Array<{ question: any; originalErrors: string[] }> = [];
    const unreparableQuestions: Array<{ question: any; errors: string[]; originalErrors: string[] }> = [];

    for (const { question, errors } of rejectedQuestions) {
      const repaired = QuestionRepairService.repairQuestion(question);

      if (repaired) {
        const validation = validateQuestion(repaired);

        if (validation.isValid) {
          repairedQuestions.push(repaired as Question);
          repairedMetadata.push({ question: repaired, originalErrors: errors });
          if (__DEV__) { console.log(`[MLBackendClient] Successfully repaired question ${question.id}`); }
        } else {
          unreparableQuestions.push({
            question,
            errors: validation.errors,
            originalErrors: errors,
          });
        }
      } else {
        unreparableQuestions.push({
          question,
          errors,
          originalErrors: errors,
        });
      }
    }

    const preFilteredCount = questions.length - preFilteredQuestions.length;
    const totalRejected = unreparableQuestions.length;
    const totalRepaired = repairedQuestions.length;
    const totalValid = validQuestions.length;

    if (preFilteredCount > 0 || totalRejected > 0 || totalRepaired > 0) {
      if (__DEV__) {
      console.log(
        `[MLBackendClient] Question processing summary:
        - Pre-filtered (fundamentally broken): ${preFilteredCount}
        - Valid on first pass: ${totalValid}
        - Successfully repaired: ${totalRepaired}
        - Rejected (unrepairable): ${totalRejected}
        - Final usable questions: ${totalValid + totalRepaired}`
      );
      }

      if (unreparableQuestions.length > 0) {
        const summary = QuestionRepairService.getrejectionSummary(unreparableQuestions);
        if (__DEV__) { console.warn(`[MLBackendClient] Rejection breakdown:`, summary); }

        await this.logRejectedQuestions(
          unreparableQuestions.map(({ question, errors, originalErrors }) => ({
            question,
            errors,
            originalErrors
          })),
          userId
        );
      }

      if (repairedQuestions.length > 0) {
        await this.logRepairedQuestions(repairedMetadata, userId);
      }
    }

    return [...validQuestions, ...repairedQuestions];
  }

  private transformQuestion(q: any): Question {
    const questionType: QuestionType = q.question_type || 'multiple_choice';

    // Base question properties
    const baseProps = {
      id: String(q.question_id || q.id || ''),
      question_text: this.formatQuestionText(q.question_text, q.question),
      explanation: q.explanation ? this.cleanQuestionText(q.explanation) : undefined,
      topic_id: q.topic_id,
      difficulty: q.difficulty,
    };

    // Transform based on question type
    switch (questionType) {
      case 'multiple_choice':
        return {
          ...baseProps,
          question_type: 'multiple_choice',
          options: this.transformSimpleOptions(q.options),
          correct_answer: String(q.correct_answer || ''),
        };

      case 'multi_select':
        return {
          ...baseProps,
          question_type: 'multi_select',
          options: this.transformSimpleOptions(q.options),
          correct_answers: Array.isArray(q.correct_answers)
            ? q.correct_answers.map((a: any) => String(a))
            : [],
          min_selections: q.min_selections,
          max_selections: q.max_selections,
        };

      case 'drag_drop_matching':
        return {
          ...baseProps,
          question_type: 'drag_drop_matching',
          options: {
            column_a: this.transformSimpleOptions(q.options?.column_a || []),
            column_b: this.transformSimpleOptions(q.options?.column_b || []),
            correct_pairs: this.transformCorrectPairs(q.options?.correct_pairs || {}),
          },
        };

      case 'drag_drop_ordering':
        return {
          ...baseProps,
          question_type: 'drag_drop_ordering',
          options: {
            steps: this.transformSimpleOptions(q.options?.steps || q.options || []),
            correct_order: Array.isArray(q.options?.correct_order)
              ? q.options.correct_order.map((id: any) => String(id))
              : [],
          },
        };

      case 'clinical_scenario': {
        const subQuestions = (q.options?.sub_questions || [])
          .filter((sq: any) => typeof sq !== 'string')
          .map((sq: any) => this.transformQuestion(sq));

        return {
          ...baseProps,
          question_type: 'clinical_scenario',
          options: {
            vignette: this.cleanQuestionText(q.options?.vignette || ''),
            sub_questions: subQuestions,
          },
        };
      }

      case 'hotspot':
        return {
          ...baseProps,
          question_type: 'hotspot',
          options: {
            image_url: q.options?.image_url || '',
            hotspot_zones: q.options?.hotspot_zones || [],
          },
        };

      default:
        // Fallback to multiple choice
        return {
          ...baseProps,
          question_type: 'multiple_choice',
          options: this.transformSimpleOptions(q.options),
          correct_answer: q.correct_answer || '',
        };
    }
  }

  private cleanQuestionText(text: any): string {
    if (!text) return '';
    if (typeof text !== 'string') {
      text = String(text);
    }

    // Remove malformed /min patterns
    return text
      .replace(/\/min(?=[a-zA-Z])/g, ' ') // "/minbpm" -> " bpm"
      .replace(/\/min(?=\d)/g, ' ') // "/min98" -> " 98"
      .replace(/\s+/g, ' ') // Normalize multiple spaces
      .trim();
  }

  private formatQuestionText(questionText: any, fallbackQuestion?: string): string {
    if (typeof questionText === 'string') {
      return this.cleanQuestionText(questionText);
    }

    if (typeof questionText === 'object' && questionText !== null) {
      // Clinical scenario format
      const scenario = questionText;
      let formatted = '';

      if (scenario.patient) formatted += `Patient: ${this.cleanQuestionText(scenario.patient)}\n\n`;
      if (scenario.chief_complaint) formatted += `Chief Complaint: ${this.cleanQuestionText(scenario.chief_complaint)}\n\n`;
      if (scenario.history) formatted += `History: ${this.cleanQuestionText(scenario.history)}\n\n`;
      if (scenario.medications) formatted += `Medications: ${this.cleanQuestionText(scenario.medications)}\n\n`;
      if (scenario.physical_exam) formatted += `Physical Exam: ${this.cleanQuestionText(scenario.physical_exam)}\n\n`;
      if (scenario.vitals) formatted += `Vitals: ${this.cleanQuestionText(scenario.vitals)}\n\n`;
      if (scenario.labs) formatted += `Labs: ${this.cleanQuestionText(scenario.labs)}\n\n`;

      formatted += this.cleanQuestionText(fallbackQuestion || 'What is the most appropriate action?');
      return formatted;
    }

    return this.cleanQuestionText(fallbackQuestion || 'Question text not available');
  }

  private transformSimpleOptions(options: any): Array<{ id: string; text: string }> {
    if (Array.isArray(options)) {
      return options
        .map((opt: any, index: number) => {
          // Handle string options directly
          if (typeof opt === 'string') {
            return {
              id: String(index),
              text: this.cleanQuestionText(opt),
            };
          }

          // Handle object options
          if (typeof opt === 'object' && opt !== null) {
            const textValue = opt.text || opt.option_text || opt.content || opt.value || '';

            // If text value is an object, try to extract meaningful text
            if (typeof textValue === 'object' && textValue !== null) {
              const extractedText = textValue.text || textValue.value || textValue.content || '';
              if (extractedText) {
                return {
                  id: String(opt.id || opt.option_id || index),
                  text: this.cleanQuestionText(String(extractedText)),
                };
              }
              // If we can't extract text, skip this option
              if (__DEV__) { console.warn('[MLBackendClient] Skipping malformed option:', opt); }
              return null;
            }

            // Valid text value
            if (textValue) {
              return {
                id: String(opt.id || opt.option_id || index),
                text: this.cleanQuestionText(String(textValue)),
              };
            }

            // No text found, skip option
            if (__DEV__) { console.warn('[MLBackendClient] Skipping option without text:', opt); }
            return null;
          }

          // Unknown format, skip
          if (__DEV__) { console.warn('[MLBackendClient] Skipping unknown option format:', opt); }
          return null;
        })
        .filter((opt): opt is { id: string; text: string } => opt !== null);
    }

    if (typeof options === 'object' && options !== null) {
      // Object format: {A: "text", B: "text"}
      return Object.entries(options).map(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          const extractedText = (value as any).text || (value as any).value || (value as any).content || '';
          return {
            id: String(key),
            text: this.cleanQuestionText(String(extractedText || key)),
          };
        }
        return {
          id: String(key),
          text: this.cleanQuestionText(typeof value === 'string' ? value : String(value)),
        };
      });
    }

    return [];
  }

  private transformCorrectPairs(pairs: any): Record<string, string> {
    if (typeof pairs !== 'object' || pairs === null) {
      return {};
    }

    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(pairs)) {
      result[String(key)] = String(value);
    }
    return result;
  }

  async submitAnswer(answerData: {
    student_id: number;
    question_id: string;
    student_answer: string; // Serialized answer (string, JSON string, or simple value)
    response_time_seconds: number;
  }): Promise<{
    is_correct: boolean;
    recall_probability: number;
    next_review_days: number;
    mastery_update: any;
    rationale?: string;
    option_rationales?: Record<string, string>;
    correct_answers?: string[];
  }> {
    const headers = await this.getAuthHeaders();

    // Transform to match ML backend API parameter names
    const apiPayload = {
      user_id: answerData.student_id,
      question_id: answerData.question_id,
      user_answer: answerData.student_answer,
      elapsed_time: answerData.response_time_seconds,
    };

    const response = await this.fetchWithRetry(
      `${EDGE_FUNCTION_URL}?action=submit_answer`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(apiPayload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      if (__DEV__) {
      console.error('[MLBackendClient] Submit answer failed:', {
        status: response.status,
        error: errorData,
        payload: apiPayload,
      });
      }
      throw new Error(errorData.error || `Failed to submit answer: ${response.statusText}`);
    }

    return await response.json();
  }

  async downloadQuestionsForOffline(
    userId: number,
    count: number = 100
  ): Promise<Question[]> {
    const headers = await this.getAuthHeaders();
    const params = new URLSearchParams({
      action: 'download_questions',
      ml_user_id: userId.toString(),
      count: count.toString(),
    });

    try {
      const response = await this.fetchWithRetry(
        `${EDGE_FUNCTION_URL}?${params}`,
        {
          method: 'GET',
          headers,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        const errorMessage = errorData.error || response.statusText;

        if (response.status >= 500) {
          if (__DEV__) { console.warn('[MLBackendClient] ML Backend service unavailable (500+ error). Returning empty set. The app will continue to function normally.'); }
          return [];
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      const questions = data.questions || [];

      const preFilteredQuestions = questions.filter((q: any) => {
        const result = QuestionRepairService.preFilter(q);
        if (!result.shouldKeep) {
          if (__DEV__) { console.log(`[MLBackendClient] PRE-FILTERED offline question ${q.question_id || q.id} (type: ${q.question_type}): ${result.reason}`); }
        }
        return result.shouldKeep;
      });

      const transformedQuestions = preFilteredQuestions.map((q: any) => this.transformQuestion(q));

      const { validQuestions, rejectedQuestions } = filterValidQuestions(transformedQuestions);

      const repairedQuestions: Question[] = [];
      const unreparableQuestions: Array<{ question: any; errors: string[] }> = [];

      for (const { question, errors } of rejectedQuestions) {
        const repaired = QuestionRepairService.repairQuestion(question);

        if (repaired) {
          const validation = validateQuestion(repaired);
          if (validation.isValid) {
            repairedQuestions.push(repaired as Question);
          } else {
            unreparableQuestions.push({ question, errors });
          }
        } else {
          unreparableQuestions.push({ question, errors });
        }
      }

      const preFilteredCount = questions.length - preFilteredQuestions.length;

      if (preFilteredCount > 0 || unreparableQuestions.length > 0 || repairedQuestions.length > 0) {
        if (__DEV__) {
        console.log(
          `[MLBackendClient] Offline download summary:
          - Pre-filtered: ${preFilteredCount}
          - Valid: ${validQuestions.length}
          - Repaired: ${repairedQuestions.length}
          - Rejected: ${unreparableQuestions.length}
          - Final usable: ${validQuestions.length + repairedQuestions.length}`
        );
        }

        if (unreparableQuestions.length > 0) {
          const summary = QuestionRepairService.getrejectionSummary(unreparableQuestions);
          if (__DEV__) { console.warn(`[MLBackendClient] Offline rejection breakdown:`, summary); }
          await this.logRejectedQuestions(unreparableQuestions, userId);
        }
      }

      return [...validQuestions, ...repairedQuestions];
    } catch (networkError) {
      if (__DEV__) { console.warn('[MLBackendClient] Network error during question download. Returning empty set. The app will continue to function normally.'); }
      return [];
    }
  }

  async syncOfflineResponses(
    userId: number,
    responses: Array<{
      question_id: string;
      student_answer: string;
      response_time_seconds: number;
      answered_at: string;
    }>
  ): Promise<{ synced_count: number }> {
    const headers = await this.getAuthHeaders();

    // Transform payload to match API guide format
    const apiPayload = {
      user_id: userId,
      responses: responses,
    };

    const response = await this.fetchWithRetry(
      `${EDGE_FUNCTION_URL}?action=sync_offline_responses`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(apiPayload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Failed to sync offline responses: ${response.statusText}`);
    }

    return await response.json();
  }

  async getStudentInsights(userId: number): Promise<{
    overall_performance: any;
    forgetting_curve: any;
    topic_performance: any[];
    weak_areas: any[];
    learning_velocity: number;
  }> {
    const headers = await this.getAuthHeaders();
    const response = await this.fetchWithRetry(
      `${EDGE_FUNCTION_URL}?action=get_insights&ml_user_id=${userId}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Failed to get student insights: ${response.statusText}`);
    }

    const rawData = await response.json();

    // Transform the data to match the expected format
    return this.transformInsightsData(rawData);
  }

  private transformInsightsData(rawData: any): {
    overall_performance: any;
    forgetting_curve: any;
    topic_performance: any[];
    weak_areas: any[];
    learning_velocity: number;
  } {
    // Create a topic lookup map
    const topicMap = new Map(nceTopics.map((topic: any) => [String(topic.id), topic.name]));

    // Transform overall performance
    const correctAnswers = Math.round(rawData.total_questions * rawData.overall_accuracy);
    const overall_performance = {
      accuracy: rawData.overall_accuracy * 100, // Convert to percentage
      total_questions: rawData.total_questions,
      correct_answers: correctAnswers,
      consistency_score: rawData.consistency_score,
    };

    // Transform forgetting curve
    const forgetting_curve = rawData.forgetting_curve_data || [];

    // Transform topic performance
    const topic_performance = Object.entries(rawData.topic_mastery || {}).map(([topicId, mastery]: [string, any]) => ({
      topic_id: topicId,
      topic_name: topicMap.get(topicId) || `Topic ${topicId}`,
      mastery_level: typeof mastery === 'number' ? mastery * 100 : 0, // Convert to percentage
      questions_answered: rawData.total_questions, // This is an approximation
    }));

    // Transform weak areas (struggle areas)
    const weak_areas = (rawData.struggle_areas || []).map((topicId: number) => {
      const mastery = (rawData.topic_mastery?.[topicId] || 0) * 100;
      const priority = mastery < 30 ? 'high' : mastery < 60 ? 'medium' : 'low';

      return {
        topic_id: String(topicId),
        topic_name: topicMap.get(String(topicId)) || `Topic ${topicId}`,
        mastery_level: mastery,
        accuracy: mastery,
        recommended_review_days: rawData.recommended_intervals?.[topicId] || 1,
        priority,
      };
    });

    return {
      overall_performance,
      forgetting_curve,
      topic_performance,
      weak_areas,
      learning_velocity: rawData.learning_velocity || 0,
    };
  }

  async getQuestionTypePerformance(userId: number): Promise<any[]> {
    const headers = await this.getAuthHeaders();
    const params = new URLSearchParams({
      action: 'get_question_type_performance',
      ml_user_id: userId.toString(),
    });

    const response = await this.fetchWithRetry(
      `${EDGE_FUNCTION_URL}?${params}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Failed to get question type performance: ${response.statusText}`);
    }

    const data = await response.json();
    return data.question_types || [];
  }

  async getConceptCoverage(userId: number, topicId?: string): Promise<{
    overall_stats: {
      mastered_count: number;
      in_progress_count: number;
      not_started_count: number;
      coverage_percentage: number;
    };
    concepts: any[];
  }> {
    const headers = await this.getAuthHeaders();
    const params = new URLSearchParams({
      action: 'get_concept_coverage',
      ml_user_id: userId.toString(),
    });

    if (topicId) {
      params.append('topic_id', topicId);
    }

    const response = await this.fetchWithRetry(
      `${EDGE_FUNCTION_URL}?${params}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Failed to get concept coverage: ${response.statusText}`);
    }

    return await response.json();
  }

  async predictTopicPerformance(
    userId: number,
    topicId: string
  ): Promise<{
    topic_name: string;
    predicted_accuracy: number;
    confidence: string;
    recommendation: string;
    preparation_needed: boolean;
  }> {
    const headers = await this.getAuthHeaders();
    const params = new URLSearchParams({
      action: 'predict_topic_performance',
      ml_user_id: userId.toString(),
      topic_id: topicId,
    });

    const response = await this.fetchWithRetry(
      `${EDGE_FUNCTION_URL}?${params}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Failed to predict topic performance: ${response.statusText}`);
    }

    return await response.json();
  }

  async getRecommendedStudyPath(
    userId: number,
    pathLength: number = 20
  ): Promise<{
    study_path: any[];
    reasoning: string;
    estimated_time_minutes: number;
  }> {
    const headers = await this.getAuthHeaders();
    const params = new URLSearchParams({
      action: 'get_study_path',
      ml_user_id: userId.toString(),
      path_length: pathLength.toString(),
    });

    const response = await this.fetchWithRetry(
      `${EDGE_FUNCTION_URL}?${params}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Failed to get study path: ${response.statusText}`);
    }

    return await response.json();
  }

  async generateQuestions(
    topicId: string,
    count: number = 10
  ): Promise<{
    success: boolean;
    generated_count: number;
    message: string;
  }> {
    const headers = await this.getAuthHeaders();

    const response = await this.fetchWithRetry(
      `${EDGE_FUNCTION_URL}?action=generate_questions`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ topic_id: topicId, count }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Failed to generate questions: ${response.statusText}`);
    }

    return await response.json();
  }

  private categorizeRejection(errors: string[]): string {
    const errorText = errors.join(' ');

    if (errorText.includes('Sub-question')) {
      return 'malformed_clinical_scenario';
    } else if (errorText.includes('correct_pairs')) {
      return 'empty_correct_pairs';
    } else if (errorText.includes('correct_order')) {
      return 'empty_correct_order';
    } else if (errorText.includes('placeholder text')) {
      return 'placeholder_text';
    } else if (errorText.includes('missing')) {
      return 'missing_required_field';
    } else {
      return 'other';
    }
  }

  private async logRejectedQuestions(
    rejectedQuestions: Array<{ question: any; errors: string[]; originalErrors?: string[] }>,
    userId: number
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const records = rejectedQuestions.map(({ question, errors, originalErrors }) => ({
        question_id: question.id || 'unknown',
        question_type: question.question_type || 'unknown',
        ml_user_id: userId,
        supabase_user_id: user.id,
        validation_errors: errors,
        question_data: question,
        rejection_reason: this.categorizeRejection(errors),
        topic_id: question.topic_id || null,
        repair_attempted: !!originalErrors,
        repair_successful: false,
        original_errors: originalErrors || null,
      }));

      await supabase.from('rejected_questions_log').insert(records);
    } catch (error) {
      if (__DEV__) { console.error('[MLBackendClient] Failed to log rejected questions:', error); }
    }
  }

  private async logRepairedQuestions(
    repairedQuestions: Array<{ question: any; originalErrors: string[] }>,
    userId: number
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const records = repairedQuestions.map(({ question, originalErrors }) => ({
        question_id: question.id || 'unknown',
        question_type: question.question_type || 'unknown',
        ml_user_id: userId,
        supabase_user_id: user.id,
        validation_errors: [],
        question_data: question,
        rejection_reason: this.categorizeRejection(originalErrors),
        topic_id: question.topic_id || null,
        repair_attempted: true,
        repair_successful: true,
        original_errors: originalErrors,
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolution_notes: 'Automatically repaired by QuestionRepairService',
      }));

      await supabase.from('rejected_questions_log').insert(records);
    } catch (error) {
      if (__DEV__) { console.error('[MLBackendClient] Failed to log repaired questions:', error); }
    }
  }

  async getQuestionsWithRetry(
    userId: number,
    topicIds: number[],
    count: number = 25,
    maxRetries: number = 2
  ): Promise<Question[]> {
    let allValidQuestions: Question[] = [];
    let remainingCount = count;
    let attempt = 0;

    while (remainingCount > 0 && attempt <= maxRetries) {
      try {
        const questions = await this.getNextQuestions(userId, remainingCount);
        allValidQuestions = [...allValidQuestions, ...questions];
        remainingCount = count - allValidQuestions.length;

        if (remainingCount <= 0) {
          break;
        }

        if (attempt < maxRetries) {
          if (__DEV__) {
          console.log(
            `[MLBackendClient] Got ${questions.length}/${count} valid questions. Retrying for ${remainingCount} more...`
          );
          }
          await this.delay(1000);
        }

        attempt++;
      } catch (error) {
        if (__DEV__) { console.error(`[MLBackendClient] Retry attempt ${attempt} failed:`, error); }
        if (attempt >= maxRetries) {
          throw error;
        }
        attempt++;
        await this.delay(2000);
      }
    }

    return allValidQuestions;
  }

  getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo;
  }

  isApproachingRateLimit(): boolean {
    if (!this.rateLimitInfo) return false;
    const percentageRemaining = (this.rateLimitInfo.remaining / this.rateLimitInfo.limit) * 100;
    return percentageRemaining < 20;
  }

  async getDiagnosticStatus(userId: number): Promise<{
    required: boolean;
    in_progress: boolean;
    completed: boolean;
    attempt_id?: string;
    questions_answered?: number;
    total_questions?: number;
  }> {
    const { data, error } = await supabase
      .from('diagnostic_exam_attempts')
      .select('*')
      .eq('ml_user_id', userId)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (__DEV__) { console.error('[MLBackendClient] Error fetching diagnostic status:', error); }
    }

    if (!data) {
      return {
        required: true,
        in_progress: false,
        completed: false,
      };
    }

    return {
      required: false,
      in_progress: !!data.started_at && !data.completed_at,
      completed: !!data.completed_at,
      attempt_id: data.id,
      questions_answered: data.questions_answered || 0,
      total_questions: data.total_questions || 50,
    };
  }

  async getDiagnosticQuestions(userId: number): Promise<Question[]> {
    if (__DEV__) { console.log('[MLBackendClient] Fetching diagnostic questions from dedicated endpoint'); }
    const headers = await this.getAuthHeaders();
    const response = await this.fetchWithRetry(
      `${EDGE_FUNCTION_URL}?action=diagnostic_questions&user_id=${userId}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Failed to get diagnostic questions: ${response.statusText}`);
    }

    const data = await response.json();
    const questions = data.questions || [];
    if (__DEV__) { console.log(`[MLBackendClient] Received ${questions.length} diagnostic questions from backend`); }

    const typeDistribution: Record<string, number> = {};
    const preFilterReasons: Record<string, number> = {};
    const reasonsByType: Record<string, Record<string, number>> = {};

    questions.forEach((q: any) => {
      const type = q.question_type || 'unknown';
      typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    });
    if (__DEV__) { console.log('[MLBackendClient] Question types received:', typeDistribution); }

    const preFilteredQuestions = questions.filter((q: any) => {
      const result = QuestionRepairService.preFilter(q);
      if (!result.shouldKeep) {
        const type = q.question_type || 'unknown';
        preFilterReasons[type] = (preFilterReasons[type] || 0) + 1;

        if (!reasonsByType[type]) {
          reasonsByType[type] = {};
        }
        reasonsByType[type][result.reason!] = (reasonsByType[type][result.reason!] || 0) + 1;

        if (__DEV__) { console.log(`[MLBackendClient] PRE-FILTERED question ${q.question_id || q.id} (type: ${q.question_type}): ${result.reason}`); }
      }
      return result.shouldKeep;
    });

    if (Object.keys(preFilterReasons).length > 0) {
      if (__DEV__) { console.log('[MLBackendClient] Pre-filter rejections by type:', preFilterReasons); }
      if (__DEV__) { console.log('[MLBackendClient] Pre-filter rejection reasons by type:'); }
      Object.entries(reasonsByType).forEach(([type, reasons]) => {
        if (__DEV__) { console.log(`  ${type}:`); }
        Object.entries(reasons).forEach(([reason, count]) => {
          if (__DEV__) { console.log(`    - ${reason}: ${count} questions`); }
        });
      });
    }
    if (__DEV__) { console.log(`[MLBackendClient] After pre-filtering: ${preFilteredQuestions.length}/${questions.length} questions remaining`); }

    const transformedQuestions = preFilteredQuestions.map((q: any) => this.transformQuestion(q));
    const { validQuestions, rejectedQuestions } = filterValidQuestions(transformedQuestions);

    const repairedQuestions: Question[] = [];
    const unreparableQuestions: Array<{ question: any; errors: string[]; originalErrors: string[] }> = [];

    for (const { question, errors } of rejectedQuestions) {
      if (__DEV__) { console.log(`[MLBackendClient] Attempting to repair question ${question.id} (${question.question_type})`); }
      const repaired = QuestionRepairService.repairQuestion(question);

      if (repaired) {
        const validation = validateQuestion(repaired);

        if (validation.isValid) {
          repairedQuestions.push(repaired as Question);
          if (__DEV__) { console.log(`[MLBackendClient] Successfully repaired question ${question.id}`); }
        } else {
          if (__DEV__) { console.warn(`[MLBackendClient] Repair failed for question ${question.id}: ${validation.errors.join(', ')}`); }
          unreparableQuestions.push({
            question,
            errors: validation.errors,
            originalErrors: errors,
          });
        }
      } else {
        if (__DEV__) { console.warn(`[MLBackendClient] Could not repair question ${question.id}`); }
        unreparableQuestions.push({
          question,
          errors,
          originalErrors: errors,
        });
      }
    }

    if (unreparableQuestions.length > 0) {
      if (__DEV__) { console.warn(`[MLBackendClient] VALIDATION REJECTED ${unreparableQuestions.length} unrepairable questions:`); }
      unreparableQuestions.forEach(({ question, errors }) => {
        if (__DEV__) { console.warn(`  - Question ${question.id} (${question.question_type}): ${errors.join(', ')}`); }
      });

      await this.logRejectedQuestions(unreparableQuestions, userId);
    }

    if (repairedQuestions.length > 0) {
      if (__DEV__) { console.log(`[MLBackendClient] Successfully repaired ${repairedQuestions.length} questions`); }
      await this.logRepairedQuestions(
        repairedQuestions.map(q => ({
          question: q,
          originalErrors: rejectedQuestions.find(rq => rq.question.id === q.id)?.errors || [],
        })),
        userId
      );
    }

    const finalQuestions = [...validQuestions, ...repairedQuestions];
    if (__DEV__) { console.log(`[MLBackendClient] FINAL: ${finalQuestions.length} valid questions (${validQuestions.length} originally valid + ${repairedQuestions.length} repaired)`); }

    return finalQuestions;
  }

  async submitDiagnosticAnswer(answerData: {
    user_id: number;
    question_id: string;
    answer: string | string[];
    response_time_ms: number;
  }): Promise<{
    success: boolean;
    is_correct?: boolean;
    rationale?: string;
    option_rationales?: Record<string, string>;
    correct_answers?: string[];
  }> {
    try {
      const headers = await this.getAuthHeaders();

      const apiPayload = {
        user_id: answerData.user_id,
        question_id: answerData.question_id,
        user_answer: answerData.answer,
        elapsed_time: Math.round(answerData.response_time_ms / 1000),
      };

      const response = await this.fetchWithRetry(
        `${EDGE_FUNCTION_URL}?action=submit_diagnostic_answer`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(apiPayload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        if (__DEV__) {
        console.error('[MLBackendClient] Submit diagnostic answer failed:', {
          status: response.status,
          error: errorData,
        });
        }
        throw new Error(errorData.error || `Failed to submit diagnostic answer: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        is_correct: data.is_correct,
        rationale: data.rationale,
        option_rationales: data.option_rationales,
        correct_answers: data.correct_answers,
      };
    } catch (error) {
      if (__DEV__) { console.log('[MLBackendClient] Diagnostic answer submission failed, continuing with local tracking:', error); }
      return { success: false };
    }
  }

  async completeDiagnosticExam(userId: number): Promise<{
    attempt_id: string;
    total_score: number;
    total_questions: number;
    percentage: number;
  }> {
    const headers = await this.getAuthHeaders();

    const response = await this.fetchWithRetry(
      `${EDGE_FUNCTION_URL}?action=complete_diagnostic`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ user_id: userId }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Failed to complete diagnostic exam: ${response.statusText}`);
    }

    return await response.json();
  }

  async getDiagnosticResults(userId: number): Promise<{
    attempt_id: string;
    total_score: number;
    total_questions: number;
    percentage: number;
    completed_at: string;
    section_scores: Array<{
      section: string;
      correct: number;
      total: number;
      percentage: number;
    }>;
    bloom_scores: Array<{
      level: string;
      correct: number;
      total: number;
      percentage: number;
    }>;
    type_scores: Array<{
      type: string;
      correct: number;
      total: number;
      percentage: number;
    }>;
    strengths: string[];
    weaknesses: string[];
    recommended_topics: Array<{
      topic: string;
      reason: string;
      priority: 'high' | 'medium' | 'low';
    }>;
  }> {
    const headers = await this.getAuthHeaders();
    const response = await this.fetchWithRetry(
      `${EDGE_FUNCTION_URL}?action=diagnostic_results&user_id=${userId}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Failed to get diagnostic results: ${response.statusText}`);
    }

    return await response.json();
  }
}

export const mlClient = new MLBackendClient();
