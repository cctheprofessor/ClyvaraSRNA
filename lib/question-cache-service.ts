import { offlinePracticeManager } from './offline-practice-manager';
import { Platform } from 'react-native';

interface CacheConfig {
  autoRefreshEnabled: boolean;
  cacheSize: number;
  minRefreshInterval: number;
}

export class QuestionCacheService {
  private config: CacheConfig = {
    autoRefreshEnabled: true,
    cacheSize: 100,
    minRefreshInterval: 60000,
  };

  private lastRefreshAttempt: number = 0;
  private refreshInProgress = false;

  async preFetchQuestions(userId: number, silent: boolean = true): Promise<void> {
    if (!userId) {
      console.warn('[CacheService] No user ID provided, skipping pre-fetch');
      return;
    }

    const now = Date.now();
    if (now - this.lastRefreshAttempt < this.config.minRefreshInterval) {
      console.log('[CacheService] Skipping pre-fetch, too soon since last attempt');
      return;
    }

    if (this.refreshInProgress) {
      console.log('[CacheService] Pre-fetch already in progress');
      return;
    }

    this.lastRefreshAttempt = now;
    this.refreshInProgress = true;

    try {
      const shouldRefresh = await offlinePracticeManager.shouldRefreshCache(userId);

      if (!shouldRefresh) {
        const status = await offlinePracticeManager.getCacheStatus(userId);
        console.log('[CacheService] Cache is fresh, skipping download', {
          status: status?.status,
          questionCount: status?.questionCount,
        });
        return;
      }

      console.log('[CacheService] Starting background cache download...');
      await offlinePracticeManager.downloadQuestionsForOffline(userId, this.config.cacheSize);
      console.log('[CacheService] Cache download completed successfully');
    } catch (error) {
      if (!silent) {
        throw error;
      }
      console.error('[CacheService] Background cache download failed (silent):', error);
    } finally {
      this.refreshInProgress = false;
    }
  }

  async preFetchOnLogin(userId: number): Promise<void> {
    if (!this.config.autoRefreshEnabled) return;

    console.log('[CacheService] Triggering pre-fetch on login for user:', userId);

    setTimeout(async () => {
      await this.preFetchQuestions(userId, true);
    }, 2000);
  }

  async preFetchOnAppStart(userId: number): Promise<void> {
    if (!this.config.autoRefreshEnabled) return;

    console.log('[CacheService] Triggering pre-fetch on app start for user:', userId);

    setTimeout(async () => {
      await this.preFetchQuestions(userId, true);
    }, 3000);
  }

  async preFetchAfterSync(userId: number): Promise<void> {
    if (!this.config.autoRefreshEnabled) return;

    console.log('[CacheService] Triggering pre-fetch after ML sync for user:', userId);

    setTimeout(async () => {
      await this.preFetchQuestions(userId, true);
    }, 1000);
  }

  async getCacheInfo(userId: number): Promise<{
    hasCachedQuestions: boolean;
    status: string;
    questionCount: number;
    lastUpdated: string | null;
    isStale: boolean;
  }> {
    const status = await offlinePracticeManager.getCacheStatus(userId);
    const metadata = await offlinePracticeManager.getCacheMetadata();

    const hasCachedQuestions = metadata !== null && metadata.userId === userId;
    const isStale = status?.status === 'stale' || false;

    return {
      hasCachedQuestions,
      status: status?.status || 'idle',
      questionCount: status?.questionCount || 0,
      lastUpdated: status?.lastUpdated || null,
      isStale,
    };
  }

  async manualRefresh(userId: number): Promise<void> {
    console.log('[CacheService] Manual refresh requested for user:', userId);
    await this.preFetchQuestions(userId, false);
  }

  setConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): CacheConfig {
    return { ...this.config };
  }

  async syncOfflineQueueAndRefresh(userId: number): Promise<void> {
    try {
      console.log('[CacheService] Syncing offline queue before cache refresh...');
      const hasPending = await offlinePracticeManager.hasPendingResponses();

      if (hasPending) {
        const result = await offlinePracticeManager.syncOfflineQueue(userId);
        console.log('[CacheService] Offline queue synced:', result);
      }

      await this.preFetchQuestions(userId, true);
    } catch (error) {
      console.error('[CacheService] Failed to sync and refresh:', error);
      throw error;
    }
  }
}

export const questionCacheService = new QuestionCacheService();
