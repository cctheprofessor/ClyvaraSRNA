import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return AsyncStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await AsyncStorage.setItem(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
  }
};

const RECENT_QUESTIONS_KEY = 'recent_answered_questions';
const CURRENT_SESSION_KEY = 'current_session_questions';

interface QuestionAttempt {
  questionId: string;
  answeredAt: string;
  isCorrect?: boolean;
}

interface SessionData {
  userId: number;
  sessionId: string;
  startedAt: string;
  questionIds: string[];
}

export class QuestionSessionTracker {
  private readonly RECENT_HISTORY_HOURS = 24;
  private currentSessionIds: Set<string> = new Set();

  async markQuestionAnswered(
    userId: number,
    questionId: string,
    isCorrect?: boolean
  ): Promise<void> {
    try {
      const recentQuestions = await this.getRecentQuestions(userId);

      const newAttempt: QuestionAttempt = {
        questionId,
        answeredAt: new Date().toISOString(),
        isCorrect,
      };

      recentQuestions.push(newAttempt);

      const key = `${RECENT_QUESTIONS_KEY}_${userId}`;
      await storage.setItem(key, JSON.stringify(recentQuestions));

      this.currentSessionIds.add(questionId);
      await this.updateCurrentSession(userId, questionId);
    } catch (error) {
      console.error('Failed to mark question as answered:', error);
    }
  }

  async getRecentQuestions(userId: number): Promise<QuestionAttempt[]> {
    try {
      const key = `${RECENT_QUESTIONS_KEY}_${userId}`;
      const data = await storage.getItem(key);

      if (!data) {
        return [];
      }

      const allAttempts: QuestionAttempt[] = JSON.parse(data);

      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - this.RECENT_HISTORY_HOURS);

      return allAttempts.filter(attempt => {
        const attemptTime = new Date(attempt.answeredAt);
        return attemptTime > cutoffTime;
      });
    } catch (error) {
      console.error('Failed to get recent questions:', error);
      return [];
    }
  }

  async getRecentQuestionIds(userId: number): Promise<string[]> {
    const recentQuestions = await this.getRecentQuestions(userId);
    return recentQuestions.map(q => q.questionId);
  }

  async clearOldHistory(userId: number): Promise<void> {
    try {
      const recentQuestions = await this.getRecentQuestions(userId);
      const key = `${RECENT_QUESTIONS_KEY}_${userId}`;
      await storage.setItem(key, JSON.stringify(recentQuestions));
    } catch (error) {
      console.error('Failed to clear old history:', error);
    }
  }

  async startNewSession(userId: number): Promise<string> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const sessionData: SessionData = {
      userId,
      sessionId,
      startedAt: new Date().toISOString(),
      questionIds: [],
    };

    this.currentSessionIds.clear();

    const key = `${CURRENT_SESSION_KEY}_${userId}`;
    await storage.setItem(key, JSON.stringify(sessionData));

    return sessionId;
  }

  async updateCurrentSession(userId: number, questionId: string): Promise<void> {
    try {
      const key = `${CURRENT_SESSION_KEY}_${userId}`;
      const data = await storage.getItem(key);

      if (!data) {
        await this.startNewSession(userId);
        return;
      }

      const session: SessionData = JSON.parse(data);

      if (!session.questionIds.includes(questionId)) {
        session.questionIds.push(questionId);
        await storage.setItem(key, JSON.stringify(session));
      }
    } catch (error) {
      console.error('Failed to update current session:', error);
    }
  }

  async getCurrentSessionQuestionIds(userId: number): Promise<string[]> {
    try {
      const key = `${CURRENT_SESSION_KEY}_${userId}`;
      const data = await storage.getItem(key);

      if (!data) {
        return [];
      }

      const session: SessionData = JSON.parse(data);
      return session.questionIds;
    } catch (error) {
      console.error('Failed to get current session questions:', error);
      return [];
    }
  }

  async endSession(userId: number): Promise<void> {
    try {
      const key = `${CURRENT_SESSION_KEY}_${userId}`;
      await storage.removeItem(key);
      this.currentSessionIds.clear();
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }

  async getExcludedQuestionIds(userId: number): Promise<string[]> {
    const recentIds = await this.getRecentQuestionIds(userId);
    const sessionIds = await this.getCurrentSessionQuestionIds(userId);

    const allIds = new Set([...recentIds, ...sessionIds]);
    return Array.from(allIds);
  }

  getSessionQuestionCount(): number {
    return this.currentSessionIds.size;
  }

  async getStatistics(userId: number): Promise<{
    recentQuestionCount: number;
    sessionQuestionCount: number;
    totalExcludedCount: number;
  }> {
    const recentIds = await this.getRecentQuestionIds(userId);
    const sessionIds = await this.getCurrentSessionQuestionIds(userId);
    const excluded = await this.getExcludedQuestionIds(userId);

    return {
      recentQuestionCount: recentIds.length,
      sessionQuestionCount: sessionIds.length,
      totalExcludedCount: excluded.length,
    };
  }
}

export const questionSessionTracker = new QuestionSessionTracker();
