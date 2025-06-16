import { supabase, TABLES, getCurrentUserId, ensureUserProfile, type Profile } from '../lib/supabase';

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

export interface OnboardingData {
  goals: string[];
  challenges: string[];
  reflections: {
    current_state: string;
    ideal_self: string;
    biggest_obstacle: string;
  };
}

class StorageService {
  // Profile methods
  async getUserProfile(): Promise<Profile | null> {
    try {
      return await ensureUserProfile();
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  async updateUserProfile(updates: Partial<Profile>): Promise<boolean> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return false;

      const { error } = await supabase
        .from(TABLES.PROFILES)
        .update(updates)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating profile:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return false;
    }
  }

  // Onboarding methods
  async saveOnboardingData(data: OnboardingData): Promise<boolean> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return false;

      const { error } = await supabase
        .from(TABLES.ONBOARDING_DATA)
        .upsert({
          user_id: userId,
          goals: data.goals,
          challenges: data.challenges,
          reflections: data.reflections,
          is_complete: true,
        });

      if (error) {
        console.error('Error saving onboarding data:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      return false;
    }
  }

  async getOnboardingData(): Promise<OnboardingData | null> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return null;

      const { data, error } = await supabase
        .from(TABLES.ONBOARDING_DATA)
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No data found
          return null;
        }
        console.error('Error getting onboarding data:', error);
        return null;
      }

      return {
        goals: data.goals || [],
        challenges: data.challenges || [],
        reflections: data.reflections || {
          current_state: '',
          ideal_self: '',
          biggest_obstacle: '',
        },
      };
    } catch (error) {
      console.error('Error getting onboarding data:', error);
      return null;
    }
  }

  async isOnboardingComplete(): Promise<boolean> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return false;

      const { data, error } = await supabase
        .from(TABLES.ONBOARDING_DATA)
        .select('is_complete')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No data found, onboarding not complete
          return false;
        }
        console.error('Error checking onboarding status:', error);
        return false;
      }

      return data.is_complete || false;
    } catch (error) {
      console.error('Error checking onboarding completion:', error);
      return false;
    }
  }

  async markOnboardingComplete(): Promise<boolean> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return false;

      const { error } = await supabase
        .from(TABLES.ONBOARDING_DATA)
        .upsert({
          user_id: userId,
          is_complete: true,
        });

      if (error) {
        console.error('Error marking onboarding complete:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error marking onboarding complete:', error);
      return false;
    }
  }

  async resetOnboarding(): Promise<boolean> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return false;

      const { error } = await supabase
        .from(TABLES.ONBOARDING_DATA)
        .upsert({
          user_id: userId,
          goals: [],
          challenges: [],
          reflections: null,
          is_complete: false,
        });

      if (error) {
        console.error('Error resetting onboarding:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error resetting onboarding:', error);
      return false;
    }
  }

  // User name methods
  async getUserName(): Promise<string | null> {
    try {
      const profile = await this.getUserProfile();
      return profile?.name || null;
    } catch (error) {
      console.error('Error getting user name:', error);
      return null;
    }
  }

  async saveUserName(name: string): Promise<boolean> {
    try {
      return await this.updateUserProfile({ name });
    } catch (error) {
      console.error('Error saving user name:', error);
      return false;
    }
  }
}

export const storageService = new StorageService();
