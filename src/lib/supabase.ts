import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {createClient} from '@supabase/supabase-js';
import {makeRedirectUri} from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

import {EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY} from '@env';
import {getErrorMessage} from '../utils/error';

// Supabase client initialization
const supabaseUrl = EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration');
  throw new Error('Missing Supabase URL or anonymous key');
}


// Required for web only
WebBrowser.maybeCompleteAuthSession();

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
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

const parseAuthCallback = (url: string): Record<string, string | null> => {
  const urlObj = new URL(url);
  const hashParams = new URLSearchParams(urlObj.hash.substring(1));

  if (hashParams.get('access_token') || hashParams.get('error')) {
    return {
      access_token: hashParams.get('access_token'),
      refresh_token: hashParams.get('refresh_token'),
      error: hashParams.get('error'),
      error_description: hashParams.get('error_description'),
    };
  }

  const {params, errorCode} = QueryParams.getQueryParams(url);
  if (errorCode) {
    return {
      access_token: null,
      refresh_token: null,
      error: errorCode,
      error_description: null,
    };
  }

  return params as Record<string, string | null>;
};

export const createSessionFromUrl = async (url: string) => {

  const {access_token, refresh_token, error, error_description} =
    parseAuthCallback(url);

  if (error) {
    console.error('❌ OAuth error:', error, error_description);
    throw new Error(error_description || error);
  }

  if (!access_token) {
    return null;
  }

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

const refreshSession = async () => {
  try {
    const {data, error} = await supabase.auth.refreshSession();
    if (error) {
      console.error('❌ Error refreshing session:', error);
      if (
        String(error.message).toLowerCase().includes('revoked') ||
        String(error.message).toLowerCase().includes('invalid')
      ) {
        await supabase.auth.signOut();
      }
      return {session: null, error};
    }
    return {session: data.session, error: null};
  } catch (error) {
    console.error('💥 Exception refreshing session:', error);
    return {session: null, error};
  }
};

export const authHelpers = {
  signUp: async (
    email: string,
    password: string,
    name?: string,
  ): Promise<{success: boolean; error?: string; user?: any}> => {
    try {
      const {data, error} = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || '',
          },
        },
      });

      if (error) {
        console.error('❌ Supabase signUp error:', error);
        return {
          success: false,
          error: error.message || 'Failed to create account',
        };
      }

      if (!data.user) {
        console.error('❌ No user data returned from signUp');
        return {
          success: false,
          error: 'Account creation failed - no user data returned',
        };
      }

      return {
        success: true,
        user: data.user,
      };
    } catch (error) {
      console.error('❌ Network/Exception error in signUp:', error);
      return {
        success: false,
        error: 'Network error - please check your connection and try again',
      };
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

  signInWithOAuth: async (provider: 'google' | 'apple') => {
    try {
      const redirectTo = Linking.createURL('/auth/callback');

      const {data, error} = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error('❌ OAuth initiation error:', error);
        return {success: false, error: error.message};
      }

      if (!data?.url) {
        console.error('❌ No OAuth URL returned');
        return {success: false, error: 'OAuth initialization failed'};
      }

      const res = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo,
      );

      if (res.type === 'success') {
        const {url} = res;
        const session = await createSessionFromUrl(url);
        if (session) {
          return {success: true};
        }
        return {success: false, error: 'Authentication completed but no session'};
      }

      if (res.type === 'dismiss' || res.type === 'cancel') {
        return {success: false, error: 'OAuth flow cancelled'};
      }

      return {success: false, error: 'OAuth flow failed'};
    } catch (error) {
      console.error('❌ OAuth flow error:', error);
      return {success: false, error: getErrorMessage(error)};
    }
  },

  // Identity Linking Functions
  linkIdentity: async (provider: 'google' | 'apple') => {
    try {

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

      

      // Open the OAuth URL in a browser and wait for the callback
      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (res.type === 'success') {
        
        const session = await createSessionFromUrl(res.url);
        return {data: {session}, error: null};
      } else {
        
        return {data: null, error: new Error('Identity linking was cancelled')};
      }
    } catch (error) {
      console.error('💥 Identity linking error:', error);
      return {data: null, error};
    }
  },

  getUserIdentities: async () => {
    try {
      const {data, error} = await supabase.auth.getUserIdentities();

      if (error) {
        console.error('❌ Error fetching user identities:', error);
        return {identities: null, error};
      }

      
      return {identities: data?.identities || [], error: null};
    } catch (error) {
      console.error('💥 Error fetching user identities:', error);
      return {identities: null, error};
    }
  },

  unlinkIdentity: async (identity: any) => {
    try {
      const {data, error} = await supabase.auth.unlinkIdentity(identity);

      if (error) {
        console.error('❌ Error unlinking identity:', error);
        return {data: null, error};
      }

      
      return {data, error: null};
    } catch (error) {
      console.error('💥 Error unlinking identity:', error);
      return {data: null, error};
    }
  },


  // Add password to OAuth account
  addPassword: async (password: string) => {
    try {
      const {data, error} = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        console.error('❌ Error adding password:', error);
        return {data: null, error};
      }

      
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

  refreshSession,

  getCurrentUser: async () => {
    try {
      let {data, error} = await Promise.race([
        supabase.auth.getUser(),
        new Promise<{data: any; error: any}>((_, reject) =>
          setTimeout(() => reject(new Error('getCurrentUser timeout')), 8000),
        ),
      ]);

      if (error &&
          (String(error.message).includes('JWT expired') ||
           String(error.message).includes('expired token'))
      ) {
        const {error: refreshError} = await authHelpers.refreshSession();
        if (refreshError) {
          console.error('❌ Session refresh failed:', refreshError);
          return {user: null, error: refreshError};
        }
        ({data, error} = await supabase.auth.getUser());
      }

      if (error) {
        console.error('❌ Error getting current user:', error);
        return {user: null, error};
      }

      return {user: data?.user || null, error: null};
    } catch (error) {
      console.error('💥 Error in getCurrentUser:', error);
      return {user: null, error};
    }
  },

  getUserDetails: async () => {
    const {user} = await authHelpers.getCurrentUser();
    return user;
  },

  isAuthenticated: async () => {
    try {
      const result = await authHelpers.getCurrentUser();
      if (result.error) {
        const errorMessage = getErrorMessage(result.error);
        if (
          errorMessage.includes('Auth session missing') ||
          errorMessage.includes('session_not_found')
        ) {
          
          return false;
        }
        console.error('❌ Authentication check failed:', result.error);
        return false;
      }
      const isAuth = !!result.user;
      
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
      console.error('❌ Error getting current user ID:', result.error);
      return null;
    }
    const userId = result.user?.id || null;
    return userId;
  } catch (error) {
    console.error('💥 Error getting current user ID:', error);
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
