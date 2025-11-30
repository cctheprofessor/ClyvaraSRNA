const ML_BACKEND_URL = process.env.ML_BACKEND_URL || 'https://clyvaraml.replit.app';
const ML_API_KEY = process.env.ML_API_KEYS || '';

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

  private getHeaders(): HeadersInit {
    return {
      'X-API-Key': ML_API_KEY,
      'Content-Type': 'application/json',
    };
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
    const response = await this.fetchWithRetry(
      `${ML_BACKEND_URL}/api/users/sync`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(userData),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to sync user: ${response.statusText}`);
    }

    return await response.json();
  }

  async getUserProgression(userId: number): Promise<{
    current_stage: string;
    performance_tier: string;
    months_since_enrollment: number;
  }> {
    const response = await this.fetchWithRetry(
      `${ML_BACKEND_URL}/api/students/${userId}/progression`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get user progression: ${response.statusText}`);
    }

    return await response.json();
  }

  async getNextQuestions(
    userId: number,
    limit: number = 25,
    topicId?: string
  ): Promise<any[]> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (topicId) {
      params.append('topic_id', topicId);
    }

    const response = await this.fetchWithRetry(
      `${ML_BACKEND_URL}/api/practice/${userId}/next-questions?${params}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get questions: ${response.statusText}`);
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
    const response = await this.fetchWithRetry(
      `${ML_BACKEND_URL}/api/practice/submit-answer`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(answerData),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to submit answer: ${response.statusText}`);
    }

    return await response.json();
  }

  async downloadQuestionsForOffline(
    userId: number,
    count: number = 100
  ): Promise<any[]> {
    const response = await this.fetchWithRetry(
      `${ML_BACKEND_URL}/api/practice/${userId}/download?count=${count}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to download questions: ${response.statusText}`);
    }

    return await response.json();
  }

  async syncOfflineResponses(responses: Array<{
    student_id: number;
    question_id: string;
    student_answer: string;
    response_time_seconds: number;
    is_correct: boolean;
    answered_at: string;
  }>): Promise<{ synced_count: number }> {
    const response = await this.fetchWithRetry(
      `${ML_BACKEND_URL}/api/practice/sync-offline`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ responses }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to sync offline responses: ${response.statusText}`);
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
    const response = await this.fetchWithRetry(
      `${ML_BACKEND_URL}/api/student-insights/${userId}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get student insights: ${response.statusText}`);
    }

    return await response.json();
  }

  async getQuestionTypePerformance(userId: number): Promise<any[]> {
    const response = await this.fetchWithRetry(
      `${ML_BACKEND_URL}/api/student-insights/${userId}/question-types`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get question type performance: ${response.statusText}`);
    }

    return await response.json();
  }

  async getConceptCoverage(userId: number): Promise<{
    mastered: string[];
    in_progress: string[];
    not_started: string[];
    coverage_percentage: number;
  }> {
    const response = await this.fetchWithRetry(
      `${ML_BACKEND_URL}/api/students/${userId}/concept-coverage`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get concept coverage: ${response.statusText}`);
    }

    return await response.json();
  }

  async predictTopicPerformance(
    userId: number,
    topicId: string
  ): Promise<{
    predicted_accuracy: number;
    confidence: string;
    preparation_recommended: boolean;
  }> {
    const response = await this.fetchWithRetry(
      `${ML_BACKEND_URL}/api/predictions/${userId}/topic-performance?topic_id=${topicId}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to predict topic performance: ${response.statusText}`);
    }

    return await response.json();
  }

  async getRecommendedStudyPath(
    userId: number,
    limit: number = 20
  ): Promise<any[]> {
    const response = await this.fetchWithRetry(
      `${ML_BACKEND_URL}/api/recommendations/${userId}/study-path?limit=${limit}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get study recommendations: ${response.statusText}`);
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
