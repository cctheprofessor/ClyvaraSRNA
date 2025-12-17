import { supabase } from './supabase';

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
    console.log('[MLBackendClient] Calling syncUser API with data:', userData);
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
      console.error('[MLBackendClient] Sync user API failed:', errorData);
      throw new Error(errorData.error || `Failed to sync user: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('[MLBackendClient] Sync user API response:', result);
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
  ): Promise<any[]> {
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
      throw new Error(errorData.error || `Failed to get questions: ${response.statusText}`);
    }

    return await response.json();
  }

  async submitAnswer(answerData: {
    student_id: number;
    question_id: string;
    student_answer: string;
    response_time_seconds: number;
    is_correct: boolean;
  }): Promise<{
    recall_probability: number;
    next_review_days: number;
    mastery_update: any;
  }> {
    const headers = await this.getAuthHeaders();

    // Transform student_id to user_id as per API guide
    const apiPayload = {
      user_id: answerData.student_id,
      question_id: answerData.question_id,
      student_answer: answerData.student_answer,
      response_time_seconds: answerData.response_time_seconds,
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
      throw new Error(errorData.error || `Failed to submit answer: ${response.statusText}`);
    }

    return await response.json();
  }

  async downloadQuestionsForOffline(
    userId: number,
    count: number = 100
  ): Promise<any[]> {
    const headers = await this.getAuthHeaders();
    const params = new URLSearchParams({
      action: 'download_questions',
      ml_user_id: userId.toString(),
      count: count.toString(),
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
      throw new Error(errorData.error || `Failed to download questions: ${response.statusText}`);
    }

    const data = await response.json();
    return data.questions || [];
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

    return await response.json();
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

  getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo;
  }

  isApproachingRateLimit(): boolean {
    if (!this.rateLimitInfo) return false;
    const percentageRemaining = (this.rateLimitInfo.remaining / this.rateLimitInfo.limit) * 100;
    return percentageRemaining < 20;
  }
}

export const mlClient = new MLBackendClient();
