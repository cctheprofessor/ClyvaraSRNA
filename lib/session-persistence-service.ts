import { supabase } from './supabase';
import { Question, AnswerFormat } from '@/types/question';

export interface SessionState {
  id: string;
  sessionType: '25' | '50' | 'focused';
  topicIds?: number[];
  questions: Question[];
  currentIndex: number;
  answers: Record<number, string>;
  answerResults: Record<number, any>;
  submittedQuestions: number[];
  startTime: number;
  lastUpdated: number;
}

export interface SavedSession {
  id: string;
  session_type: string;
  topic_ids: number[];
  questions: any[];
  current_index: number;
  answers: Record<string, string>;
  answer_results: Record<string, any>;
  submitted_questions: number[];
  start_time: string;
  last_updated: string;
  is_completed: boolean;
}

class SessionPersistenceService {
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentSessionId: string | null = null;

  /**
   * Check if there's an active session to resume
   */
  async getActiveSession(sessionType: '25' | '50' | 'focused'): Promise<SessionState | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('practice_session_state')
        .select('*')
        .eq('user_id', user.id)
        .eq('session_type', sessionType)
        .eq('is_completed', false)
        .order('last_updated', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      const session: SavedSession = data;

      // Ignore sessions older than 24 hours
      const lastUpdated = new Date(session.last_updated).getTime();
      const now = Date.now();
      if (now - lastUpdated > 24 * 60 * 60 * 1000) {
        await this.deleteSession(session.id);
        return null;
      }

      return this.deserializeSession(session);
    } catch (error) {
      console.error('[SessionPersistence] Failed to get active session:', error);
      return null;
    }
  }

  /**
   * Save or update the current session state
   */
  async saveSession(state: SessionState): Promise<void> {
    // Debounce saves to avoid too many database writes
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(async () => {
      try {
        await this.saveSessionImmediate(state);
      } catch (error) {
        console.error('[SessionPersistence] Failed to save session:', error);
      }
    }, 500);
  }

  /**
   * Save session immediately without debouncing
   */
  async saveSessionImmediate(state: SessionState): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const sessionData = {
        user_id: user.id,
        session_type: state.sessionType,
        topic_ids: state.topicIds || [],
        questions: state.questions,
        current_index: state.currentIndex,
        answers: state.answers,
        answer_results: state.answerResults,
        submitted_questions: state.submittedQuestions,
        start_time: new Date(state.startTime).toISOString(),
        last_updated: new Date().toISOString(),
        is_completed: false,
      };

      if (this.currentSessionId) {
        // Update existing session
        const { error } = await supabase
          .from('practice_session_state')
          .update(sessionData)
          .eq('id', this.currentSessionId);

        if (error) throw error;
      } else {
        // Create new session
        const { data, error } = await supabase
          .from('practice_session_state')
          .insert(sessionData)
          .select('id')
          .single();

        if (error) throw error;
        if (data) {
          this.currentSessionId = data.id;
        }
      }
    } catch (error) {
      console.error('[SessionPersistence] Failed to save session:', error);
      throw error;
    }
  }

  /**
   * Mark session as completed and clean up
   */
  async completeSession(sessionId?: string): Promise<void> {
    try {
      const id = sessionId || this.currentSessionId;
      if (!id) return;

      await supabase
        .from('practice_session_state')
        .update({ is_completed: true, last_updated: new Date().toISOString() })
        .eq('id', id);

      if (id === this.currentSessionId) {
        this.currentSessionId = null;
      }
    } catch (error) {
      console.error('[SessionPersistence] Failed to complete session:', error);
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await supabase
        .from('practice_session_state')
        .delete()
        .eq('id', sessionId);

      if (sessionId === this.currentSessionId) {
        this.currentSessionId = null;
      }
    } catch (error) {
      console.error('[SessionPersistence] Failed to delete session:', error);
    }
  }

  /**
   * Clean up old completed sessions
   */
  async cleanupOldSessions(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      await supabase
        .from('practice_session_state')
        .delete()
        .eq('user_id', user.id)
        .lt('last_updated', twentyFourHoursAgo);
    } catch (error) {
      console.error('[SessionPersistence] Failed to cleanup old sessions:', error);
    }
  }

  /**
   * Set the current session ID for updates
   */
  setCurrentSessionId(id: string): void {
    this.currentSessionId = id;
  }

  /**
   * Clear the current session ID
   */
  clearCurrentSessionId(): void {
    this.currentSessionId = null;
  }

  /**
   * Convert database record to SessionState
   */
  private deserializeSession(saved: SavedSession): SessionState {
    return {
      id: saved.id,
      sessionType: saved.session_type as '25' | '50' | 'focused',
      topicIds: saved.topic_ids,
      questions: saved.questions as Question[],
      currentIndex: saved.current_index,
      answers: this.convertKeysToNumbers(saved.answers),
      answerResults: this.convertKeysToNumbers(saved.answer_results),
      submittedQuestions: saved.submitted_questions,
      startTime: new Date(saved.start_time).getTime(),
      lastUpdated: new Date(saved.last_updated).getTime(),
    };
  }

  /**
   * Convert string keys to numbers for answers/results
   */
  private convertKeysToNumbers(obj: Record<string, any>): Record<number, any> {
    const result: Record<number, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[parseInt(key, 10)] = value;
    }
    return result;
  }

  /**
   * Get session progress summary
   */
  getProgressSummary(state: SessionState): {
    completed: number;
    total: number;
    percentage: number;
  } {
    const completed = state.submittedQuestions.length;
    const total = state.questions.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
  }
}

export const sessionPersistenceService = new SessionPersistenceService();
