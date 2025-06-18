import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {createClient} from '@supabase/supabase-js';
import {makeRedirectUri} from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';

import {EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY} from '@env';

console.log('🔧 Supabase client initialization:');
console.log('- URL:', EXPO_PUBLIC_SUPABASE_URL ? 'Set ✅' : 'Missing ❌');
console.log('- Key:', EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'Set ✅' : 'Missing ❌');
console.log('- URL value:', EXPO_PUBLIC_SUPABASE_URL);

// Required for web only
WebBrowser.maybeCompleteAuthSession();

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
  },
);

// Generate the redirect URI
const redirectTo = makeRedirectUri();

export const createSessionFromUrl = async (url: string) => {
  console.log('🔗 Processing auth callback URL:', url);

  // Parse both query params and hash params to handle different OAuth flows
  const urlObj = new URL(url);

  // Try hash params first (for some OAuth flows)
  let params = new URLSearchParams(urlObj.hash.substring(1));

  // If no hash params, try query params
  if (!params.get('access_token') && !params.get('error')) {
    const {params: queryParams, errorCode} = QueryParams.getQueryParams(url);

    if (errorCode) {
      console.error('❌ OAuth error:', errorCode);
      throw new Error(errorCode);
    }

    const {access_token, refresh_token, error, error_description} = queryParams;

    if (error) {
      console.error('❌ OAuth error:', error, error_description);
      throw new Error(error_description || error);
    }

    if (!access_token) {
      console.log('ℹ️ No access token found in URL');
      return null;
    }

    console.log('✅ Found tokens in query params');
    const {data, error: sessionError} = await supabase.auth.setSession({
      access_token,
      refresh_token: refresh_token || '',
    });

    if (sessionError) {
      console.error('❌ Session creation error:', sessionError);
      throw sessionError;
    }

    return data.session;
  }

  // Handle hash params (original implementation)
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  const error = params.get('error');
  const error_description = params.get('error_description');

  if (error) {
    console.error('❌ OAuth error:', error, error_description);
    throw new Error(error_description || error);
  }

  if (!access_token) {
    console.log('ℹ️ No access token found in URL');
    return null;
  }

  console.log('✅ Found tokens in hash params');
  const {data, error: sessionError} = await supabase.auth.setSession({
    access_token,
    refresh_token: refresh_token || '',
  });

  if (sessionError) {
    console.error('❌ Session creation error:', sessionError);
    throw sessionError;
  }

  return data.session;
};

// Database table names
export const TABLES = {
  PROFILES: 'profiles',
  JOURNAL_ENTRIES: 'journal_entries',
  ONBOARDING_DATA: 'onboarding_data',
  USER_STREAKS: 'user_streaks',
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

export interface UserStreak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  total_days_with_entries: number;
  streak_percentage: number;
  last_entry_date: string | null;
  streak_updated_at: string;
  created_at: string;
  updated_at: string;
}

// Identity Linking Types
export interface UserIdentity {
  id: string;
  user_id: string;
  identity_data: {
    email?: string;
    email_verified?: boolean;
    phone_verified?: boolean;
    sub?: string;
    [key: string]: any;
  };
  identity_id: string;
  provider: string;
  created_at: string;
  updated_at: string;
}

export interface IdentityLinkingResult {
  data: {
    session?: any;
  } | null;
  error: any;
}

export interface UserIdentitiesResult {
  identities: UserIdentity[] | null;
  error: any;
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
        userData: response.data?.user
          ? 'User object present'
          : 'No user object',
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

  signInWithProvider: async (provider: 'google' | 'apple') => {
    try {
      console.log('🚀 Starting OAuth flow for:', provider);
      console.log('📍 Redirect URI:', redirectTo);

      const {data, error} = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error('❌ OAuth initiation error:', error);
        return {data: null, error};
      }

      if (!data?.url) {
        console.error('❌ No OAuth URL returned');
        return {data: null, error: new Error('No OAuth URL returned')};
      }

      console.log('🌐 Opening OAuth URL:', data.url);

      // Open the OAuth URL in a browser and wait for the callback
      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (res.type === 'success') {
        console.log('✅ OAuth flow completed successfully');
        const session = await createSessionFromUrl(res.url);
        return {data: {session}, error: null};
      } else {
        console.log('❌ OAuth flow cancelled or failed:', res.type);
        return {data: null, error: new Error('OAuth flow was cancelled')};
      }
    } catch (error) {
      console.error('💥 OAuth flow error:', error);
      return {data: null, error};
    }
  },

  // Identity Linking Functions
  linkIdentity: async (provider: 'google' | 'apple') => {
    try {
      console.log('🔗 Starting identity linking for:', provider);
      console.log('📍 Redirect URI:', redirectTo);

      const {data, error} = await supabase.auth.linkIdentity({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error('❌ Identity linking initiation error:', error);
        return {data: null, error};
      }

      if (!data?.url) {
        console.error('❌ No identity linking URL returned');
        return {
          data: null,
          error: new Error('No identity linking URL returned'),
        };
      }

      console.log('🌐 Opening identity linking URL:', data.url);

      // Open the OAuth URL in a browser and wait for the callback
      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (res.type === 'success') {
        console.log('✅ Identity linking completed successfully');
        const session = await createSessionFromUrl(res.url);
        return {data: {session}, error: null};
      } else {
        console.log('❌ Identity linking cancelled or failed:', res.type);
        return {data: null, error: new Error('Identity linking was cancelled')};
      }
    } catch (error) {
      console.error('💥 Identity linking error:', error);
      return {data: null, error};
    }
  },

  getUserIdentities: async () => {
    try {
      console.log('🔍 Fetching user identities...');
      const {data, error} = await supabase.auth.getUserIdentities();

      if (error) {
        console.error('❌ Error fetching user identities:', error);
        return {identities: null, error};
      }

      console.log(
        '✅ User identities fetched successfully:',
        data?.identities?.length || 0,
        'identities',
      );
      return {identities: data?.identities || [], error: null};
    } catch (error) {
      console.error('💥 Error fetching user identities:', error);
      return {identities: null, error};
    }
  },

  unlinkIdentity: async (identity: any) => {
    try {
      console.log('🔓 Unlinking identity:', identity.provider);
      const {data, error} = await supabase.auth.unlinkIdentity(identity);

      if (error) {
        console.error('❌ Error unlinking identity:', error);
        return {data: null, error};
      }

      console.log('✅ Identity unlinked successfully');
      return {data, error: null};
    } catch (error) {
      console.error('💥 Error unlinking identity:', error);
      return {data: null, error};
    }
  },

  // Add password to OAuth account
  addPassword: async (password: string) => {
    try {
      console.log('🔐 Adding password to OAuth account...');
      const {data, error} = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        console.error('❌ Error adding password:', error);
        return {data: null, error};
      }

      console.log('✅ Password added successfully');
      return {data, error: null};
    } catch (error) {
      console.error('💥 Error adding password:', error);
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
        const errorMessage =
          result.error &&
          typeof result.error === 'object' &&
          'message' in result.error
            ? (result.error as any).message
            : '';
        if (
          errorMessage.includes('Auth session missing') ||
          errorMessage.includes('session_not_found')
        ) {
          console.log('ℹ️ No active session found (user not logged in)');
          return false;
        }
        console.error('❌ Authentication check failed:', result.error);
        return false;
      }
      const isAuth = !!result.user;
      console.log(
        '✅ Authentication check complete:',
        isAuth ? 'User authenticated' : 'No user session',
      );
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
