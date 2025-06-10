import AsyncStorage from '@react-native-async-storage/async-storage';
import {safeAwait} from '../utils/safeAwait';

export interface JournalEntry {
  id: string;
  text: string;
  date: string;
  themes: {name: string; count: number}[];
  emotions: {name: string; percentage: number}[];
  perspective: string;
}

export interface JournalStats {
  totalTime: string;
  currentStreak: number;
  totalEntries: number;
  lastEntryDate: string;
}

const STORAGE_KEYS = {
  ENTRIES: '@InnerSight:entries',
  STATS: '@InnerSight:stats',
  ONBOARDING_COMPLETE: '@InnerSight:onboarding_complete',
};

export const storage = {
  async saveEntry(entry: JournalEntry): Promise<void> {
    const existingEntries = await this.getEntries();
    const updatedEntries = [...existingEntries, entry];

    const [saveError] = await safeAwait(
      AsyncStorage.setItem(
        STORAGE_KEYS.ENTRIES,
        JSON.stringify(updatedEntries),
      ),
    );
    if (saveError) {
      console.error('Error saving entry:', saveError);
      throw saveError;
    }

    const [updateError] = await safeAwait(this.updateStats(entry));
    if (updateError) {
      console.error('Error updating stats:', updateError);
      throw updateError;
    }
  },

  async getEntries(): Promise<JournalEntry[]> {
    const [error, entries] = await safeAwait(
      AsyncStorage.getItem(STORAGE_KEYS.ENTRIES),
    );
    if (error) {
      console.error('Error getting entries:', error);
      return [];
    }
    return entries ? JSON.parse(entries) : [];
  },

  // Stats
  async getStats(): Promise<JournalStats> {
    const [error, stats] = await safeAwait(
      AsyncStorage.getItem(STORAGE_KEYS.STATS),
    );
    if (error) {
      console.error('Error getting stats:', error);
      return {
        totalTime: '0h 0m',
        currentStreak: 0,
        totalEntries: 0,
        lastEntryDate: '',
      };
    }

    if (stats) {
      return JSON.parse(stats);
    }

    // Return default stats if none exist
    return {
      totalTime: '0h 0m',
      currentStreak: 0,
      totalEntries: 0,
      lastEntryDate: '',
    };
  },

  async updateStats(entry: JournalEntry): Promise<void> {
    const currentStats = await this.getStats();
    const entryDate = new Date(entry.date);
    const lastEntryDate = currentStats.lastEntryDate
      ? new Date(currentStats.lastEntryDate)
      : null;

    // Calculate streak
    let newStreak = currentStats.currentStreak;
    if (lastEntryDate) {
      const dayDiff = Math.floor(
        (entryDate.getTime() - lastEntryDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (dayDiff === 1) {
        newStreak += 1;
      } else if (dayDiff > 1) {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    // Calculate total time (simplified - assuming 5 minutes per entry)
    const totalMinutes = currentStats.totalEntries * 5 + 5;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const totalTime = `${hours}h ${minutes}m`;

    const updatedStats: JournalStats = {
      totalTime,
      currentStreak: newStreak,
      totalEntries: currentStats.totalEntries + 1,
      lastEntryDate: entry.date,
    };

    const [error] = await safeAwait(
      AsyncStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(updatedStats)),
    );
    if (error) {
      console.error('Error updating stats:', error);
      throw error;
    }
  },

  // Onboarding
  async isOnboardingComplete(): Promise<boolean> {
    const [error, complete] = await safeAwait(
      AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE),
    );
    if (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
    return complete === 'false';
  },

  async setOnboardingComplete(): Promise<void> {
    const [error] = await safeAwait(
      AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true'),
    );
    if (error) {
      console.error('Error setting onboarding complete:', error);
      throw error;
    }
  },

  async resetOnboarding(): Promise<void> {
    const [error] = await safeAwait(
      AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETE),
    );
    if (error) {
      console.error('Error resetting onboarding:', error);
      throw error;
    }
  },
};
