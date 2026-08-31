import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { AgentType } from '../../lib/chatEngine';

export class IntentService {
  /**
   * Layer 2 Fuzzy Matching against Supabase PostgreSQL `pg_trgm` RPC
   */
  public static async matchIntent(query: string, threshold: number = 0.30): Promise<{ agent: AgentType; action: string } | null> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.rpc('match_user_intent', {
          search_query: query,
          similarity_threshold: threshold
        });

        if (!error && data && data.length > 0) {
          return {
            agent: data[0].agent_type as AgentType,
            action: data[0].action_type
          };
        }
      } catch (err) {
        console.warn('IntentService: Supabase RPC error, skipping:', err);
      }
    }
    return null;
  }
}
