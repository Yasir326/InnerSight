import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeAwait } from '../utils/safeAwait';

export interface OnboardingData {
  userName: string;
  goals: string[];
  challenges: string[];
  reflections: {
    current_state: string;
    ideal_self: string;
    biggest_obstacle: string;
  };
  completedAt: string;
}

const ONBOARDING_KEY = '@journal_onboarding_data';
const ONBOARDING_COMPLETE_KEY = '@journal_onboarding_complete';

export const saveOnboardingData = async (
  data: OnboardingData,
): Promise<void> => {
  const [dataError] = await safeAwait(AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(data)));
  if (dataError) {
    console.error('Error saving onboarding data:', dataError);
    throw dataError;
  }

  const [completeError] = await safeAwait(AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true'));
  if (completeError) {
    console.error('Error saving onboarding completion status:', completeError);
    throw completeError;
  }
};

export const getOnboardingData = async (): Promise<OnboardingData | null> => {
  const [error, data] = await safeAwait(AsyncStorage.getItem(ONBOARDING_KEY));
  if (error) {
    console.error('Error getting onboarding data:', error);
    return null;
  }
  return data ? JSON.parse(data) : null;
};

export const isOnboardingComplete = async (): Promise<boolean> => {
  const [error, complete] = await safeAwait(AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY));
  if (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
  return complete === 'true';
};

export const resetOnboarding = async (): Promise<void> => {
  const [dataError] = await safeAwait(AsyncStorage.removeItem(ONBOARDING_KEY));
  if (dataError) {
    console.error('Error removing onboarding data:', dataError);
    throw dataError;
  }

  const [completeError] = await safeAwait(AsyncStorage.removeItem(ONBOARDING_COMPLETE_KEY));
  if (completeError) {
    console.error('Error removing onboarding completion status:', completeError);
    throw completeError;
  }
};

// Get user's name from storage
export const getUserName = async (): Promise<string | null> => {
  const USER_NAME_KEY = '@journal_user_name';
  const [error, name] = await safeAwait(AsyncStorage.getItem(USER_NAME_KEY));
  if (error) {
    console.error('Error getting user name:', error);
    return null;
  }
  return name;
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
