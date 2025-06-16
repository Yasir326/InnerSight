import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {createClient} from '@supabase/supabase-js';

import {EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY} from '@env';

console.log('🔧 Supabase client initialization:');
console.log('- URL:', EXPO_PUBLIC_SUPABASE_URL ? 'Set ✅' : 'Missing ❌');
console.log('- Key:', EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'Set ✅' : 'Missing ❌');
console.log('- URL value:', EXPO_PUBLIC_SUPABASE_URL);

export const supabase = createClient(
  EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

export const createSessionFromUrl = async (url: string) => {
  const urlObj = new URL(url);
  const params = new URLSearchParams(urlObj.hash.substring(1));

  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  const error = params.get('error');
  const error_description = params.get('error_description');

  if (error) {
    throw new Error(error_description || error);
  }

  if (!access_token) {
    console.log('No access token found in URL');
    return null;
  }

  const {data, error: sessionError} = await supabase.auth.setSession({
    access_token,
    refresh_token: refresh_token || '',
  });

  if (sessionError) throw sessionError;
  return data.session;
};

// Database table names
export const TABLES = {
  PROFILES: 'profiles',
  JOURNAL_ENTRIES: 'journal_entries',
  ONBOARDING_DATA: 'onboarding_data',
} as const;

// Database types
export interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  conversation_data: any;
  analysis_data: any | null;
  alternative_perspective: string | null;
  ai_insights: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingData {
  id: string;
  user_id: string;
  goals: string[];
  challenges: string[];
  reflections: {
    current_state: string;
    ideal_self: string;
    biggest_obstacle: string;
  } | null;
  is_complete: boolean;
  created_at: string;
  updated_at: string;
}

export const authHelpers = {
  signUp: async (email: string, password: string, name?: string) => {
    console.log('🚀 Starting signUp request...');
    console.log('- Email:', email);
    console.log('- Password length:', password.length);
    console.log('- Name:', name);
    console.log('- Supabase URL:', EXPO_PUBLIC_SUPABASE_URL);
    console.log('- Supabase Key exists:', !!EXPO_PUBLIC_SUPABASE_ANON_KEY);
    
    try {
      console.log('📡 Making Supabase auth.signUp call...');
      const response = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name ?? '',
          },
        },
      });
      
      console.log('📝 Raw Supabase response:', {
        hasData: !!response.data,
        hasError: !!response.error,
        errorMessage: response.error?.message,
        userData: response.data?.user ? 'User object present' : 'No user object',
      });
      
      return {data: response.data, error: response.error};
    } catch (error) {
      console.error('💥 Network/Exception error in signUp:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace',
      });
      return {data: null, error};
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      const {data, error} = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return {data, error};
    } catch (error) {
      return {data: null, error};
    }
  },

  signInWithProvider: async (provider: 'google' | 'apple' | 'github') => {
    try {
      const {data, error} = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: 'innersight://auth/callback',
        },
      });
      return {data, error};
    } catch (error) {
      return {data: null, error};
    }
  },

  signOut: async () => {
    try {
      const {error} = await supabase.auth.signOut();
      return {error};
    } catch (error) {
      return {error};
    }
  },

  getCurrentUser: async () => {
    try {
      const {data, error} = await supabase.auth.getUser();
      if (error) {
        return {user: null, error};
      }
      return {user: data?.user || null, error: null};
    } catch (error) {
      return {user: null, error};
    }
  },

  getUserDetails: async () => {
    const {user} = await authHelpers.getCurrentUser();
    return user;
  },

  isAuthenticated: async () => {
    console.log('🔍 Starting authentication check...');
    try {
      const result = await authHelpers.getCurrentUser();
      if (result.error) {
        const errorMessage = result.error && typeof result.error === 'object' && 'message' in result.error 
          ? (result.error as any).message 
          : '';
        if (errorMessage.includes('Auth session missing') || 
            errorMessage.includes('session_not_found')) {
          console.log('ℹ️ No active session found (user not logged in)');
          return false;
        }
        console.error('❌ Authentication check failed:', result.error);
        return false;
      }
      const isAuth = !!result.user;
      console.log('✅ Authentication check complete:', isAuth ? 'User authenticated' : 'No user session');
      return isAuth;
    } catch (error) {
      console.error('❌ Authentication check failed:', error);
      return false;
    }
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },

  resetPassword: async (email: string) => {
    try {
      const {data, error} = await supabase.auth.resetPasswordForEmail(email);
      return {data, error};
    } catch (error) {
      return {data: null, error};
    }
  },
};

export const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const result = await authHelpers.getCurrentUser();
    if (result.error) {
      console.error('Error getting current user ID:', result.error);
      return null;
    }
    return result.user?.id || null;
  } catch (error) {
    console.error('Error getting current user ID:', error);
    return null;
  }
};

export const ensureUserProfile = async (): Promise<Profile | null> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const {user} = await authHelpers.getCurrentUser();

    const {data: existingProfile, error: profileError} = await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!profileError && existingProfile) {
      return existingProfile;
    }

    const {data: newProfile, error: createError} = await supabase
      .from(TABLES.PROFILES)
      .insert({
        user_id: userId,
        name: user?.user_metadata?.name || user?.email?.split('@')[0] || null,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating user profile:', createError);
      return null;
    }

    return newProfile || null;
  } catch (error) {
    console.error('Error ensuring user profile:', error);
    return null;
  }
};
