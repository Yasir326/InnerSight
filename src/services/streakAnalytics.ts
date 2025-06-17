import { supabase, TABLES, getCurrentUserId, type UserStreak } from '../lib/supabase';

export interface StreakSummary {
  currentStreak: number;
  longestStreak: number;
  totalDaysWithEntries: number;
  streakPercentage: number; // percentage of days with entries in the last 30 days
}

/**
 * Gets streak data from Supabase (automatically updated by database triggers)
 */
export const analyzeUserStreaks = async (): Promise<StreakSummary> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.error('No authenticated user found');
      return {
        currentStreak: 0,
        longestStreak: 0,
        totalDaysWithEntries: 0,
        streakPercentage: 0,
      };
    }

    const { data: streakData, error } = await supabase
      .from(TABLES.USER_STREAKS)
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No streak data found - user hasn't made any entries yet
        return {
          currentStreak: 0,
          longestStreak: 0,
          totalDaysWithEntries: 0,
          streakPercentage: 0,
        };
      }
      console.error('Error loading streak data:', error);
      return {
        currentStreak: 0,
        longestStreak: 0,
        totalDaysWithEntries: 0,
        streakPercentage: 0,
      };
    }

    return {
      currentStreak: streakData.current_streak,
      longestStreak: streakData.longest_streak,
      totalDaysWithEntries: streakData.total_days_with_entries,
      streakPercentage: streakData.streak_percentage,
    };
  } catch (error) {
    console.error('Error analyzing user streaks:', error);
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalDaysWithEntries: 0,
      streakPercentage: 0,
    };
  }
};

/**
 * Gets current streak for quick display
 */
export const getCurrentStreak = async (): Promise<number> => {
  const analytics = await analyzeUserStreaks();
  return analytics.currentStreak;
};

/**
 * Gets the raw streak data from Supabase
 */
export const getStreakData = async (): Promise<UserStreak | null> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.error('No authenticated user found');
      return null;
    }

    const { data: streakData, error } = await supabase
      .from(TABLES.USER_STREAKS)
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No streak data found
        return null;
      }
      console.error('Error loading streak data:', error);
      return null;
    }

    return streakData;
  } catch (error) {
    console.error('Error getting streak data:', error);
    return null;
  }
};

/**
 * Manually recalculate streaks for the current user
 * This is useful for data migration or fixing inconsistencies
 */
export const recalculateUserStreaks = async (): Promise<boolean> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.error('No authenticated user found');
      return false;
    }

    // Call the Supabase function to recalculate streaks
    const { error } = await supabase.rpc('update_user_streaks_for_user', {
      target_user_id: userId
    });

    if (error) {
      console.error('Error recalculating streaks:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error recalculating streaks:', error);
    return false;
  }
};

/**
 * Gets streak emoji based on current streak length
 */
export const getStreakEmoji = (streakDays: number): string => {
  if (streakDays === 0) return '📝';
  if (streakDays === 1) return '🌱';
  if (streakDays <= 3) return '🔥';
  if (streakDays <= 7) return '⚡';
  if (streakDays <= 14) return '🚀';
  if (streakDays <= 30) return '💎';
  if (streakDays <= 60) return '👑';
  return '🏆'; // 60+ days
};

/**
 * Gets motivational message based on streak
 */
export const getStreakMessage = (streakDays: number): string => {
  if (streakDays === 0) return 'Start your journey!';
  if (streakDays === 1) return 'Great start!';
  if (streakDays <= 3) return 'Building momentum!';
  if (streakDays <= 7) return 'On fire!';
  if (streakDays <= 14) return 'Incredible dedication!';
  if (streakDays <= 30) return 'Unstoppable!';
  if (streakDays <= 60) return 'Legendary streak!';
  return 'Hall of Fame!';
};

/**
 * Check if user's current streak is at risk (no entry today)
 */
export const isStreakAtRisk = async (): Promise<boolean> => {
  try {
    const streakData = await getStreakData();
    if (!streakData || streakData.current_streak === 0) {
      return false; // No streak to risk
    }

    const today = new Date().toDateString();
    const lastEntryDate = streakData.last_entry_date 
      ? new Date(streakData.last_entry_date).toDateString()
      : null;

    // If last entry was not today, streak is at risk
    return lastEntryDate !== today;
  } catch (error) {
    console.error('Error checking streak risk:', error);
    return false;
  }
};

/**
 * Get streak insights for the user
 */
export const getStreakInsights = async (): Promise<{
  isOnStreak: boolean;
  streakAtRisk: boolean;
  daysUntilMilestone: number;
  nextMilestone: number;
  encouragementMessage: string;
}> => {
  try {
    const streakData = await analyzeUserStreaks();
    const atRisk = await isStreakAtRisk();

    const milestones = [1, 3, 7, 14, 30, 60, 100, 365];
    const nextMilestone = milestones.find(m => m > streakData.currentStreak) || 1000;
    const daysUntilMilestone = nextMilestone - streakData.currentStreak;

    let encouragementMessage = '';
    if (streakData.currentStreak === 0) {
      encouragementMessage = 'Ready to start your journaling journey? Every expert was once a beginner!';
    } else if (atRisk) {
      encouragementMessage = `Don't break your ${streakData.currentStreak}-day streak! A quick entry today keeps the momentum going.`;
    } else if (daysUntilMilestone <= 3) {
      encouragementMessage = `You're just ${daysUntilMilestone} days away from your ${nextMilestone}-day milestone!`;
    } else {
      encouragementMessage = `Amazing ${streakData.currentStreak}-day streak! Keep up the great work.`;
    }

    return {
      isOnStreak: streakData.currentStreak > 0,
      streakAtRisk: atRisk,
      daysUntilMilestone,
      nextMilestone,
      encouragementMessage,
    };
  } catch (error) {
    console.error('Error getting streak insights:', error);
    return {
      isOnStreak: false,
      streakAtRisk: false,
      daysUntilMilestone: 1,
      nextMilestone: 1,
      encouragementMessage: 'Start your journaling journey today!',
    };
  }
};
