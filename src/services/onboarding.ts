import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeAwait } from '../utils/safeAwait';
import { storageService } from './storage';
import { getCurrentUserId, supabase } from '../lib/supabase';
import { OnboardingData } from '../types/types';

// Legacy AsyncStorage keys for backward compatibility
const ONBOARDING_KEY = '@journal_onboarding_data';
const ONBOARDING_COMPLETE_KEY = '@journal_onboarding_complete';
const USER_NAME_KEY = '@journal_user_name';
const ONBOARDING_STORAGE_KEY = '@journal_onboarding_storage_data';

export const saveOnboardingData = async (data: OnboardingData): Promise<void> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const supabaseData = {
      user_id: userId,
      goals: data.goals,
      challenges: data.challenges,
      reflections: data.reflections,
      is_complete: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const {error} = await supabase
      .from('onboarding_data')
      .upsert(supabaseData, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('❌ Error saving onboarding data to Supabase:', error);
      throw new Error('Failed to save onboarding data');
    }

    // Also save to AsyncStorage as backup
    await AsyncStorage.setItem(
      ONBOARDING_STORAGE_KEY,
      JSON.stringify(data),
    );
  } catch (error) {
    console.error('❌ Error in saveOnboardingData:', error);
    throw error;
  }
};

export const getOnboardingData = async (): Promise<OnboardingData | null> => {
  try {
    // Try to get data from Supabase first
    const supabaseData = await storageService.getOnboardingData();
    const profile = await storageService.getUserProfile();
    
    if (supabaseData) {
      return {
        userName: profile?.name || '',
        goals: supabaseData.goals,
        challenges: supabaseData.challenges,
        reflections: supabaseData.reflections,
        completedAt: new Date().toISOString(), // We don't store this separately anymore
      };
    }

    // Fallback to AsyncStorage for backward compatibility
    const [error, data] = await safeAwait(AsyncStorage.getItem(ONBOARDING_KEY));
    if (error) {
      console.error('Error getting onboarding data from AsyncStorage:', error);
      return null;
    }
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting onboarding data:', error);
    return null;
  }
};

export const isOnboardingComplete = async (): Promise<boolean> => {
  try {
    // Check Supabase first
    const isComplete = await storageService.isOnboardingComplete();
    if (isComplete) {
      return true;
    }

    // Fallback to AsyncStorage for backward compatibility
    const [error, complete] = await safeAwait(AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY));
    if (error) {
      console.error('Error checking onboarding status from AsyncStorage:', error);
      return false;
    }
    return complete === 'true';
  } catch (error) {
    console.error('Error checking onboarding completion:', error);
    return false;
  }
};

export const resetOnboarding = async (): Promise<void> => {
  try {
    // Clear AsyncStorage
    await AsyncStorage.multiRemove([
      ONBOARDING_STORAGE_KEY,
      ONBOARDING_COMPLETE_KEY,
      USER_NAME_KEY,
    ]);

    // Clear from Supabase
    const userId = await getCurrentUserId();
    if (userId) {
      const {error} = await supabase
        .from('onboarding_data')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error deleting onboarding data from Supabase:', error);
      }
    }
  } catch (error) {
    console.error('❌ Error resetting onboarding:', error);
    throw error;
  }
};

// Get user's name from storage (updated to use Supabase)
export const getUserName = async (): Promise<string | null> => {
  try {
    // Try to get from Supabase profile first
    const profile = await storageService.getUserProfile();
    if (profile?.name) {
      return profile.name;
    }

    // Fallback to AsyncStorage for backward compatibility
    const [error, name] = await safeAwait(AsyncStorage.getItem(USER_NAME_KEY));
    if (error) {
      console.error('Error getting user name from AsyncStorage:', error);
      return null;
    }
    return name;
  } catch (error) {
    console.error('Error getting user name:', error);
    return null;
  }
};

// Generate personalized prompts based on onboarding data
export const generatePersonalizedPrompts = (data: OnboardingData): string[] => {
  const prompts: string[] = [];

  // Goal-based prompts
  if (data.goals.includes('stress')) {
    prompts.push('What moments today brought you peace?');
    prompts.push('How did you handle stress today?');
  }

  if (data.goals.includes('growth')) {
    prompts.push('What did you learn about yourself today?');
    prompts.push('How did you challenge yourself today?');
  }

  if (data.goals.includes('gratitude')) {
    prompts.push("What are three things you're grateful for today?");
    prompts.push('Who made your day better?');
  }

  // Challenge-based prompts
  if (data.challenges.includes('overwhelmed')) {
    prompts.push('What felt manageable today?');
    prompts.push('How can you simplify tomorrow?');
  }

  if (data.challenges.includes('anxious')) {
    prompts.push('What thoughts are you carrying today?');
    prompts.push('What would you tell a friend feeling this way?');
  }

  // Default prompts if none match
  if (prompts.length === 0) {
    prompts.push('How are you feeling right now?');
    prompts.push("What's on your mind today?");
    prompts.push('What would make tomorrow better?');
  }

  return prompts;
};
