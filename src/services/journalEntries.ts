import {
  supabase,
  TABLES,
  getCurrentUserId,
  type JournalEntry as SupabaseJournalEntry,
} from '../lib/supabase';
import {
  recalculateUserStreaks,
  calculateStreaksFromEntries,
  updateStreaksManually,
} from './streakAnalytics';

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  conversationData?: any;
  analysisData?: any;
  alternativePerspective?: string;
  aiInsights?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JournalStats {
  totalTime: string;
  currentStreak: number;
  totalEntries: number;
  lastEntryDate: string;
}

class JournalEntriesService {
  // Convert Supabase entry to app format
  private convertFromSupabase(entry: SupabaseJournalEntry): JournalEntry {
    return {
      id: entry.id,
      title: entry.title,
      content: entry.content,
      conversationData: entry.conversation_data,
      analysisData: entry.analysis_data,
      alternativePerspective: entry.alternative_perspective || undefined,
      aiInsights: entry.ai_insights || undefined,
      createdAt: entry.created_at,
      updatedAt: entry.updated_at,
    };
  }

  private convertToSupabase(entry: Partial<JournalEntry>) {
    return {
      title: entry.title,
      content: entry.content,
      conversation_data: entry.conversationData,
      analysis_data: entry.analysisData,
      alternative_perspective: entry.alternativePerspective,
      ai_insights: entry.aiInsights,
    };
  }

  async saveEntry(
    entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<JournalEntry | null> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        console.error('❌ No authenticated user found');
        return null;
      }

      const supabaseEntry = this.convertToSupabase(entry);

      const {data, error} = await supabase
        .from(TABLES.JOURNAL_ENTRIES)
        .insert({
          user_id: userId,
          ...supabaseEntry,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Database error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });

        // Check if it's the streak_percentage ambiguity error
        if (
          error.message?.includes('streak_percentage') &&
          error.message?.includes('ambiguous')
        ) {
          console.error(
            '🔍 Column ambiguity detected - this might be a database trigger issue',
          );

          // Try the direct save method as a fallback
          const directResult = await this.saveEntryDirectly(entry, userId);

          if (directResult) {
            return directResult;
          }

          // If direct save also failed, try raw SQL approach
          return await this.saveEntryMinimal(entry, userId);
        }

        // Check for other common database issues
        if (error.code === '42702') {
          console.error('🔍 Column ambiguity error detected (42702)');
          return await this.saveEntryDirectly(entry, userId);
        }

        if (error.code === '23505') {
          console.error(
            '🔍 Unique constraint violation - entry might already exist',
          );
          return null;
        }

        if (error.code === '23503') {
          console.error(
            '🔍 Foreign key constraint violation - user might not exist in profiles',
          );
          return null;
        }

        return null;
      }

      const savedEntry = this.convertFromSupabase(data);

      // Manually update streaks as a fallback in case database triggers failed
      await this.updateUserStreaks();

      return savedEntry;
    } catch (error) {
      console.error('💥 Unexpected error saving journal entry:', error);
      return null;
    }
  }

  async updateEntry(
    id: string,
    updates: Partial<JournalEntry>,
  ): Promise<JournalEntry | null> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        console.error('No authenticated user found');
        return null;
      }

      const supabaseUpdates = this.convertToSupabase(updates);

      const {data, error} = await supabase
        .from(TABLES.JOURNAL_ENTRIES)
        .update(supabaseUpdates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating journal entry:', error);
        return null;
      }

      return this.convertFromSupabase(data);
    } catch (error) {
      console.error('Error updating journal entry:', error);
      return null;
    }
  }

  async getEntries(): Promise<JournalEntry[]> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        console.error('No authenticated user found');
        return [];
      }

      const {data, error} = await supabase
        .from(TABLES.JOURNAL_ENTRIES)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', {ascending: false});

      if (error) {
        console.error('Error getting journal entries:', error);
        return [];
      }

      return data.map(entry => this.convertFromSupabase(entry));
    } catch (error) {
      console.error('Error getting journal entries:', error);
      return [];
    }
  }

  async getEntry(id: string): Promise<JournalEntry | null> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        console.error('No authenticated user found');
        return null;
      }

      const {data, error} = await supabase
        .from(TABLES.JOURNAL_ENTRIES)
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Entry not found
          return null;
        }
        console.error('Error getting journal entry:', error);
        return null;
      }

      return this.convertFromSupabase(data);
    } catch (error) {
      console.error('Error getting journal entry:', error);
      return null;
    }
  }

  async deleteEntry(id: string): Promise<boolean> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        console.error('No authenticated user found');
        return false;
      }

      const {error} = await supabase
        .from(TABLES.JOURNAL_ENTRIES)
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting journal entry:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting journal entry:', error);
      return false;
    }
  }

  async getStats(): Promise<JournalStats> {
    try {
      const entries = await this.getEntries();

      if (entries.length === 0) {
        return {
          totalTime: '0h 0m',
          currentStreak: 0,
          totalEntries: 0,
          lastEntryDate: '',
        };
      }

      // Calculate total time (simplified - assuming 5 minutes per entry)
      const totalMinutes = entries.length * 5;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const totalTime = `${hours}h ${minutes}m`;

      // Calculate streak
      const sortedEntries = entries.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      let currentStreak = 0;
      let lastDate: Date | null = null;

      for (const entry of sortedEntries) {
        const entryDate = new Date(entry.createdAt);
        entryDate.setHours(0, 0, 0, 0); // Reset time to start of day

        if (!lastDate) {
          lastDate = entryDate;
          currentStreak = 1;
          continue;
        }

        const dayDiff = Math.floor(
          (lastDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (dayDiff === 1) {
          currentStreak++;
          lastDate = entryDate;
        } else if (dayDiff > 1) {
          break; // Streak broken
        }
        // If dayDiff === 0, it's the same day, continue
      }

      return {
        totalTime,
        currentStreak,
        totalEntries: entries.length,
        lastEntryDate: entries[0]?.createdAt || '',
      };
    } catch (error) {
      console.error('Error calculating stats:', error);
      return {
        totalTime: '0h 0m',
        currentStreak: 0,
        totalEntries: 0,
        lastEntryDate: '',
      };
    }
  }

  async searchEntries(query: string): Promise<JournalEntry[]> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        console.error('No authenticated user found');
        return [];
      }

      const {data, error} = await supabase
        .from(TABLES.JOURNAL_ENTRIES)
        .select('*')
        .eq('user_id', userId)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .order('created_at', {ascending: false});

      if (error) {
        console.error('Error searching journal entries:', error);
        return [];
      }

      return data.map(entry => this.convertFromSupabase(entry));
    } catch (error) {
      console.error('Error searching journal entries:', error);
      return [];
    }
  }

  // Alternative save method that might avoid trigger issues
  private async saveEntryDirectly(
    entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string,
  ): Promise<JournalEntry | null> {
    try {
      // Use a very explicit insert to avoid any potential trigger conflicts
      const {data, error} = await supabase
        .from(TABLES.JOURNAL_ENTRIES)
        .insert([
          {
            user_id: userId,
            title: entry.title || '',
            content: entry.content || '',
            conversation_data: entry.conversationData || null,
            analysis_data: entry.analysisData || null,
            alternative_perspective: entry.alternativePerspective || null,
            ai_insights: entry.aiInsights || null,
          },
        ])
        .select('*')
        .single();

      if (error) {
        console.error('❌ Direct save failed:', error);
        return null;
      }

      const savedEntry = this.convertFromSupabase(data);

      // Update streaks manually since we bypassed potential triggers
      await this.updateUserStreaks();

      return savedEntry;
    } catch (error) {
      console.error('❌ Direct save exception:', error);
      return null;
    }
  }

  // Alternative save method that bypasses potential database triggers
  private async saveEntryMinimal(
    entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string,
  ): Promise<JournalEntry | null> {
    try {
      // Save only essential fields to avoid triggering complex database functions
      const {data, error} = await supabase
        .from(TABLES.JOURNAL_ENTRIES)
        .insert({
          user_id: userId,
          title: entry.title || 'Journal Entry',
          content: entry.content || '',
          // Skip optional fields that might trigger database functions
          conversation_data: null,
          analysis_data: null,
          alternative_perspective: null,
          ai_insights: null,
        })
        .select('*')
        .single();

      if (error) {
        console.error('❌ Minimal data insert failed:', error);
        return null;
      }

      const savedEntry = this.convertFromSupabase(data);

      // Try to update with the additional data in a separate call
      if (
        entry.conversationData ||
        entry.analysisData ||
        entry.alternativePerspective ||
        entry.aiInsights
      ) {
        try {
          const {error: updateError} = await supabase
            .from(TABLES.JOURNAL_ENTRIES)
            .update({
              conversation_data: entry.conversationData || null,
              analysis_data: entry.analysisData || null,
              alternative_perspective: entry.alternativePerspective || null,
              ai_insights: entry.aiInsights || null,
            })
            .eq('id', savedEntry.id);

          if (updateError) {
            console.warn(
              '⚠️ Failed to update additional data, but entry was saved:',
              updateError,
            );
          }
        } catch (updateErr) {
          console.warn('⚠️ Exception updating additional data:', updateErr);
        }
      }

      // Manually update streaks as a fallback in case database triggers failed
      await this.updateUserStreaks();

      return savedEntry;
    } catch (error) {
      console.error('❌ Minimal data insert exception:', error);
      return null;
    }
  }

  // Comprehensive streak update with multiple fallbacks
  private async updateUserStreaks(): Promise<void> {
    try {
      // First try: Database function (might fail due to trigger issues)
      const dbFunctionSuccess = await recalculateUserStreaks();
      if (dbFunctionSuccess) {
        return;
      }

      // Second try: Client-side calculation and manual update
      const clientStreaks = await calculateStreaksFromEntries();
      const manualUpdateSuccess = await updateStreaksManually(clientStreaks);

      if (!manualUpdateSuccess) {
        console.warn('⚠️ All streak update methods failed');
      }
    } catch (error) {
      console.error('❌ Exception during streak update:', error);
    }
  }
}

export const journalEntriesService = new JournalEntriesService();
