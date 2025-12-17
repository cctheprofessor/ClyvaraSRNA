import { Platform } from 'react-native';
import { mlClient } from './ml-backend-client';
import { filterValidQuestions } from './question-validator';

const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return null;
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    }
  }
};

const OFFLINE_QUEUE_KEY = 'ml_offline_queue';
const CACHED_QUESTIONS_KEY = 'ml_cached_questions';
const CACHE_METADATA_KEY = 'ml_cache_metadata';
const CACHE_STATUS_KEY = 'ml_cache_status';

interface QueuedResponse {
  student_id: number;
  question_id: string;
  student_answer: string;
  response_time_seconds: number;
  answered_at: string;
}

interface CachedQuestions {
  questions: any[];
  downloadedAt: string;
  userId: number;
  count: number;
}

interface CacheMetadata {
  downloadedAt: string;
  questionCount: number;
  userId: number;
}

export type CacheStatus = 'idle' | 'downloading' | 'ready' | 'stale' | 'error';

interface CacheStatusInfo {
  status: CacheStatus;
  userId: number;
  lastUpdated: string;
  questionCount: number;
  error?: string;
}

export class OfflinePracticeManager {
  private readonly CACHE_STALENESS_DAYS = 7;
  private isDownloading = false;

  async getCacheStatus(userId: number): Promise<CacheStatusInfo | null> {
    try {
      const statusData = await storage.getItem(CACHE_STATUS_KEY);
      if (!statusData) return null;

      const status: CacheStatusInfo = JSON.parse(statusData);
      if (status.userId !== userId) return null;

      return status;
    } catch (error) {
      console.error('Failed to get cache status:', error);
      return null;
    }
  }

  async setCacheStatus(statusInfo: CacheStatusInfo): Promise<void> {
    try {
      await storage.setItem(CACHE_STATUS_KEY, JSON.stringify(statusInfo));
    } catch (error) {
      console.error('Failed to set cache status:', error);
      throw error;
    }
  }

  async queueResponse(response: QueuedResponse): Promise<void> {
    try {
      const existingQueue = await this.getQueue();
      existingQueue.push(response);
      await storage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(existingQueue));
    } catch (error) {
      console.error('Failed to queue response:', error);
      throw error;
    }
  }

  async getQueue(): Promise<QueuedResponse[]> {
    try {
      const queueData = await storage.getItem(OFFLINE_QUEUE_KEY);
      return queueData ? JSON.parse(queueData) : [];
    } catch (error) {
      console.error('Failed to get queue:', error);
      return [];
    }
  }

  async clearQueue(): Promise<void> {
    try {
      await storage.removeItem(OFFLINE_QUEUE_KEY);
    } catch (error) {
      console.error('Failed to clear queue:', error);
      throw error;
    }
  }

  async hasPendingResponses(): Promise<boolean> {
    const queue = await this.getQueue();
    return queue.length > 0;
  }

  async getPendingResponsesCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  async syncOfflineQueue(userId: number): Promise<{ success: boolean; syncedCount: number; error?: string }> {
    try {
      const queue = await this.getQueue();

      if (queue.length === 0) {
        return { success: true, syncedCount: 0 };
      }

      // Transform queue items to match API format (remove student_id and is_correct from responses)
      const responses = queue.map(item => ({
        question_id: item.question_id,
        student_answer: item.student_answer,
        response_time_seconds: item.response_time_seconds,
        answered_at: item.answered_at,
      }));

      const result = await mlClient.syncOfflineResponses(userId, responses);

      await this.clearQueue();

      return { success: true, syncedCount: result.synced_count };
    } catch (error) {
      console.error('Failed to sync offline queue:', error);
      return {
        success: false,
        syncedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async downloadQuestionsForOffline(userId: number, count: number = 100): Promise<void> {
    if (this.isDownloading) {
      console.log('Download already in progress, skipping...');
      return;
    }

    try {
      this.isDownloading = true;

      await this.setCacheStatus({
        status: 'downloading',
        userId,
        lastUpdated: new Date().toISOString(),
        questionCount: 0,
      });

      const questions = await mlClient.downloadQuestionsForOffline(userId, count);

      const cachedData: CachedQuestions = {
        questions,
        downloadedAt: new Date().toISOString(),
        userId,
        count: questions.length,
      };

      await storage.setItem(CACHED_QUESTIONS_KEY, JSON.stringify(cachedData));

      const metadata: CacheMetadata = {
        downloadedAt: cachedData.downloadedAt,
        questionCount: cachedData.count,
        userId,
      };
      await storage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata));

      await this.setCacheStatus({
        status: 'ready',
        userId,
        lastUpdated: cachedData.downloadedAt,
        questionCount: questions.length,
      });

      console.log(`Successfully cached ${questions.length} questions for user ${userId}`);
    } catch (error) {
      console.error('Failed to download questions:', error);
      await this.setCacheStatus({
        status: 'error',
        userId,
        lastUpdated: new Date().toISOString(),
        questionCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      this.isDownloading = false;
    }
  }

  async getCachedQuestions(userId: number): Promise<any[] | null> {
    try {
      const cachedData = await storage.getItem(CACHED_QUESTIONS_KEY);

      if (!cachedData) {
        return null;
      }

      const parsed: CachedQuestions = JSON.parse(cachedData);

      if (parsed.userId !== userId) {
        return null;
      }

      const { validQuestions, rejectedQuestions } = filterValidQuestions(parsed.questions);

      if (rejectedQuestions.length > 0) {
        console.warn(`[OfflinePracticeManager] Filtered ${rejectedQuestions.length} invalid cached questions`);
      }

      const isStale = this.isCacheStale(parsed.downloadedAt);
      if (isStale) {
        console.warn('Cached questions are stale');
        await this.setCacheStatus({
          status: 'stale',
          userId,
          lastUpdated: parsed.downloadedAt,
          questionCount: validQuestions.length,
        });
      } else {
        await this.setCacheStatus({
          status: 'ready',
          userId,
          lastUpdated: parsed.downloadedAt,
          questionCount: validQuestions.length,
        });
      }

      return validQuestions;
    } catch (error) {
      console.error('Failed to get cached questions:', error);
      return null;
    }
  }

  async shouldRefreshCache(userId: number): Promise<boolean> {
    const status = await this.getCacheStatus(userId);

    if (!status) return true;
    if (status.status === 'idle' || status.status === 'error') return true;
    if (status.status === 'downloading') return false;
    if (status.status === 'stale') return true;

    const metadata = await this.getCacheMetadata();
    if (!metadata || metadata.userId !== userId) return true;

    return this.isCacheStale(metadata.downloadedAt);
  }

  async getCacheMetadata(): Promise<CacheMetadata | null> {
    try {
      const metadata = await storage.getItem(CACHE_METADATA_KEY);
      return metadata ? JSON.parse(metadata) : null;
    } catch (error) {
      console.error('Failed to get cache metadata:', error);
      return null;
    }
  }

  isCacheStale(downloadedAt: string): boolean {
    const downloadDate = new Date(downloadedAt);
    const now = new Date();
    const daysSinceDownload = (now.getTime() - downloadDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceDownload > this.CACHE_STALENESS_DAYS;
  }

  async clearCachedQuestions(): Promise<void> {
    try {
      await storage.removeItem(CACHED_QUESTIONS_KEY);
      await storage.removeItem(CACHE_METADATA_KEY);
    } catch (error) {
      console.error('Failed to clear cached questions:', error);
      throw error;
    }
  }

  async getRandomCachedQuestions(userId: number, count: number): Promise<any[]> {
    const cached = await this.getCachedQuestions(userId);

    if (!cached || cached.length === 0) {
      return [];
    }

    const shuffled = [...cached].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }
}

export const offlinePracticeManager = new OfflinePracticeManager();
