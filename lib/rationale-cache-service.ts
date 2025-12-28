import { supabase } from './supabase';

interface RationaleCache {
  rationale?: string;
  option_rationales?: Record<string, string>;
  correct_answers?: string[];
}

export class RationaleCacheService {
  async getRationale(questionId: string): Promise<RationaleCache | null> {
    try {
      const { data, error } = await supabase
        .from('question_rationales')
        .select('rationale, option_rationales, correct_answers')
        .eq('question_id', questionId)
        .maybeSingle();

      if (error) {
        console.error('[RationaleCache] Error fetching rationale:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[RationaleCache] Failed to get rationale:', error);
      return null;
    }
  }

  async setRationale(questionId: string, cache: RationaleCache): Promise<void> {
    try {
      const { error } = await supabase
        .from('question_rationales')
        .upsert({
          question_id: questionId,
          rationale: cache.rationale || null,
          option_rationales: cache.option_rationales || {},
          correct_answers: cache.correct_answers || [],
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'question_id',
        });

      if (error) {
        console.error('[RationaleCache] Error setting rationale:', error);
      }
    } catch (error) {
      console.error('[RationaleCache] Failed to set rationale:', error);
    }
  }

  async batchSetRationales(rationales: Array<{ questionId: string; cache: RationaleCache }>): Promise<void> {
    try {
      const records = rationales.map(({ questionId, cache }) => ({
        question_id: questionId,
        rationale: cache.rationale || null,
        option_rationales: cache.option_rationales || {},
        correct_answers: cache.correct_answers || [],
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('question_rationales')
        .upsert(records, {
          onConflict: 'question_id',
        });

      if (error) {
        console.error('[RationaleCache] Error batch setting rationales:', error);
      }
    } catch (error) {
      console.error('[RationaleCache] Failed to batch set rationales:', error);
    }
  }
}

export const rationaleCacheService = new RationaleCacheService();
