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
      throw new Error(errorData.error || `Failed to sync user: ${response.statusText}`);
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
    const response = await this.fetchWithRetry(
      `${EDGE_FUNCTION_URL}?action=submit_answer`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(answerData),
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
    throw new Error('Offline download not yet implemented via proxy');
  }

  async syncOfflineResponses(responses: Array<{
    student_id: number;
    question_id: string;
    student_answer: string;
    response_time_seconds: number;
    is_correct: boolean;
    answered_at: string;
  }>): Promise<{ synced_count: number }> {
    throw new Error('Offline sync not yet implemented via proxy');
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
    throw new Error('Question type performance not yet implemented via proxy');
  }

  async getConceptCoverage(userId: number): Promise<{
    mastered: string[];
    in_progress: string[];
    not_started: string[];
    coverage_percentage: number;
  }> {
    throw new Error('Concept coverage not yet implemented via proxy');
  }

  async predictTopicPerformance(
    userId: number,
    topicId: string
  ): Promise<{
    predicted_accuracy: number;
    confidence: string;
    preparation_recommended: boolean;
  }> {
    throw new Error('Topic performance prediction not yet implemented via proxy');
  }

  async getRecommendedStudyPath(
    userId: number,
    limit: number = 20
  ): Promise<any[]> {
    throw new Error('Study path recommendations not yet implemented via proxy');
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
