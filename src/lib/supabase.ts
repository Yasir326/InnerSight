import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {createClient} from '@supabase/supabase-js';
import {makeRedirectUri} from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

import {EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY} from '@env';
import {getErrorMessage} from '../utils/error';
import {debugLog} from '../utils/logger';

// Supabase client initialization
const supabaseUrl = EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration');
  throw new Error('Missing Supabase URL or anonymous key');
}

// Required for web only
WebBrowser.maybeCompleteAuthSession();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

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

// Authentication state interfaces
export interface AuthenticationResult {
  authenticated: boolean;
  needsReauth?: boolean;
  error?: string;
  user?: any;
  recovered?: boolean;
  recoveryAttempted?: boolean;
}

export interface SessionRefreshResult {
  success: boolean;
  error?: string;
  session?: any;
}

export interface SessionClearResult {
  success: boolean;
  error?: string;
}

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

      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (res.type === 'success') {
        const {url} = res;
        if (__DEV__) {
          debugLog('🔗 Processing OAuth callback...');
        }

        // Process the callback and wait for session to be established
        const session = await createSessionFromUrl(url);

        if (session) {
          if (__DEV__) {
            debugLog('✅ OAuth session established successfully');
          }

          // Wait a bit more to ensure session is fully propagated
          await new Promise(resolve => setTimeout(resolve, 500));

          return {success: true, session};
        } else {
          console.error('❌ Failed to establish session from OAuth callback');
          return {success: false, error: 'Failed to establish session'};
        }
      } else {
        return {
          success: false,
          error: 'OAuth cancelled or failed',
        };
      }
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
      if (__DEV__) {
        debugLog('🔍 Fetching user identities...');
      }

      // First check if we have a valid session
      const {
        data: {session},
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        return {identities: null, error: sessionError};
      }

      if (!session) {
        console.error('❌ No active session found');
        return {
          identities: null,
          error: new Error('No active session. Please sign in again.'),
        };
      }

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

  // Check if account exists with given email
  checkAccountExists: async (
    email: string,
  ): Promise<{exists: boolean; error?: string}> => {
    try {
      if (__DEV__) {
        debugLog('🔍 Checking if account exists for email:', email);
      }

      // Try to sign in with a dummy password to check if account exists
      // This will fail but give us information about whether the account exists
      const {error} = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: 'dummy-password-for-check',
      });

      if (error) {
        const errorMessage = error.message.toLowerCase();

        // If the error indicates invalid credentials, the account exists
        if (
          errorMessage.includes('invalid login credentials') ||
          errorMessage.includes('wrong password') ||
          errorMessage.includes('invalid password')
        ) {
          if (__DEV__) {
            debugLog('✅ Account exists for email:', email);
          }
          return {exists: true};
        }

        // If the error indicates user not found, account doesn't exist
        if (
          errorMessage.includes('user not found') ||
          errorMessage.includes('email not found') ||
          errorMessage.includes('no user found')
        ) {
          if (__DEV__) {
            debugLog('ℹ️ No account found for email:', email);
          }
          return {exists: false};
        }

        // For other errors, assume account doesn't exist
        if (__DEV__) {
          debugLog(
            'ℹ️ Assuming no account exists due to error:',
            error.message,
          );
        }
        return {exists: false};
      }

      // If no error (which shouldn't happen with dummy password), assume exists
      if (__DEV__) {
        debugLog(
          '⚠️ Unexpected success with dummy password - assuming account exists',
        );
      }
      return {exists: true};
    } catch (error) {
      console.error('💥 Error checking account existence:', error);
      return {exists: false, error: getErrorMessage(error)};
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
      let {data, error} = await Promise.race([
        supabase.auth.getUser(),
        new Promise<{data: any; error: any}>((_, reject) =>
          setTimeout(() => reject(new Error('getCurrentUser timeout')), 8000),
        ),
      ]);

      if (
        error &&
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

  isAuthenticated: async (): Promise<boolean | AuthenticationResult> => {
    if (__DEV__) {
      debugLog('🔍 Starting authentication check...');
    }
    try {
      const result = await authHelpers.getCurrentUser();
      if (result.error) {
        const errorMessage = getErrorMessage(result.error);
        if (
          errorMessage.includes('Auth session missing') ||
          errorMessage.includes('session_not_found')
        ) {
          if (__DEV__) {
            debugLog(
              'ℹ️ No active session found, attempting to refresh session...',
            );
          }

          // Try to refresh the session
          const refreshResult = await authHelpers.refreshSession();
          if (refreshResult.success) {
            if (__DEV__) {
              debugLog('✅ Session refreshed successfully');
            }
            return true;
          } else {
            if (__DEV__) {
              debugLog('ℹ️ Session refresh failed - user needs to re-login');
            }
            return {
              authenticated: false,
              needsReauth: true,
              error: 'Session expired. Please log in again.',
            };
          }
        }
        console.error('❌ Authentication check failed:', result.error);
        return {
          authenticated: false,
          needsReauth: false,
          error: errorMessage,
        };
      }
      const isAuth = !!result.user;

      return isAuth;
    } catch (error) {
      console.error('❌ Authentication check failed:', error);
      return {
        authenticated: false,
        needsReauth: false,
        error: getErrorMessage(error),
      };
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

  // New method to refresh session
  refreshSession: async (): Promise<SessionRefreshResult> => {
    try {
      if (__DEV__) {
        debugLog('🔄 Attempting to refresh session...');
      }
      const {data, error} = await supabase.auth.refreshSession();

      if (error) {
        console.error('❌ Session refresh failed:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      if (data?.session) {
        if (__DEV__) {
          debugLog('✅ Session refreshed successfully');
        }
        return {
          success: true,
          session: data.session,
        };
      } else {
        if (__DEV__) {
          debugLog('❌ No session returned from refresh');
        }
        return {
          success: false,
          error: 'No session returned from refresh',
        };
      }
    } catch (error) {
      console.error('💥 Error refreshing session:', error);
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  },

  // Enhanced method to check auth state with recovery options
  checkAuthWithRecovery: async (): Promise<AuthenticationResult> => {
    if (__DEV__) {
      debugLog('🔍 Starting enhanced authentication check...');
    }
    try {
      // First, try to get the current user
      const result = await authHelpers.getCurrentUser();

      if (result.error) {
        const errorMessage = getErrorMessage(result.error);

        if (
          errorMessage.includes('Auth session missing') ||
          errorMessage.includes('session_not_found') ||
          errorMessage.includes('JWT expired')
        ) {
          if (__DEV__) {
            debugLog('⚠️ Session issue detected, attempting recovery...');
          }

          // Try to refresh the session
          const refreshResult = await authHelpers.refreshSession();

          if (refreshResult.success) {
            if (__DEV__) {
              debugLog('✅ Session recovered successfully');
            }
            return {
              authenticated: true,
              recovered: true,
              user: refreshResult.session?.user,
            };
          } else {
            if (__DEV__) {
              debugLog('❌ Session recovery failed');
            }
            return {
              authenticated: false,
              needsReauth: true,
              error: 'Your session has expired. Please log in again.',
              recoveryAttempted: true,
            };
          }
        }

        // Other auth errors
        return {
          authenticated: false,
          needsReauth: false,
          error: errorMessage,
        };
      }

      // Success case
      const isAuth = !!result.user;
      return {
        authenticated: isAuth,
        user: result.user,
        needsReauth: false,
      };
    } catch (error) {
      console.error('💥 Enhanced auth check failed:', error);
      return {
        authenticated: false,
        needsReauth: false,
        error: getErrorMessage(error),
      };
    }
  },

  // Method to clear invalid session and prepare for re-auth
  clearInvalidSession: async (): Promise<SessionClearResult> => {
    try {
      if (__DEV__) {
        debugLog('🧹 Clearing invalid session...');
      }
      await supabase.auth.signOut();
      if (__DEV__) {
        debugLog('✅ Invalid session cleared');
      }
      return {success: true};
    } catch (error) {
      console.error('❌ Error clearing invalid session:', error);
      return {success: false, error: getErrorMessage(error)};
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

/**
 * Enhanced authentication helper that handles session recovery and provides
 * clear guidance for re-authentication when needed.
 *
 * @param options Configuration options for authentication handling
 * @returns Promise with authentication result and recommended actions
 */
export const handleAuthenticationWithRecovery = async (options?: {
  clearInvalidSession?: boolean;
}): Promise<
  AuthenticationResult & {
    recommendedAction?: 'none' | 'refresh' | 'relogin' | 'clear_and_relogin';
  }
> => {
  const {clearInvalidSession = true} = options || {};

  if (__DEV__) {
    debugLog('🔐 Starting comprehensive authentication check...');
  }

  try {
    // Use the enhanced auth check method
    const authResult = await authHelpers.checkAuthWithRecovery();

    if (authResult.authenticated) {
      return {
        ...authResult,
        recommendedAction: 'none',
      };
    }

    // Handle different failure scenarios
    if (authResult.needsReauth) {
      if (clearInvalidSession) {
        if (__DEV__) {
          debugLog(
            '🧹 Clearing invalid session before recommending re-login...',
          );
        }
        await authHelpers.clearInvalidSession();
      }

      return {
        ...authResult,
        recommendedAction: 'relogin',
      };
    }

    // For other auth failures, recommend clearing session and re-login
    if (clearInvalidSession) {
      await authHelpers.clearInvalidSession();
    }

    return {
      ...authResult,
      recommendedAction: 'clear_and_relogin',
    };
  } catch (error) {
    console.error('💥 Comprehensive auth check failed:', error);

    if (clearInvalidSession) {
      await authHelpers.clearInvalidSession();
    }

    return {
      authenticated: false,
      needsReauth: true,
      error: getErrorMessage(error),
      recommendedAction: 'clear_and_relogin',
    };
  }
};

/**
 * Utility to check if user needs to re-authenticate and get user-friendly message
 */
export const getAuthenticationStatus = async (): Promise<{
  isAuthenticated: boolean;
  needsAction: boolean;
  message?: string;
  actionType?: 'login' | 'refresh' | 'error';
}> => {
  const result = await handleAuthenticationWithRecovery();

  if (result.authenticated) {
    return {
      isAuthenticated: true,
      needsAction: false,
    };
  }

  switch (result.recommendedAction) {
    case 'relogin':
    case 'clear_and_relogin':
      return {
        isAuthenticated: false,
        needsAction: true,
        message:
          result.error || 'Your session has expired. Please log in again.',
        actionType: 'login',
      };
    case 'refresh':
      return {
        isAuthenticated: false,
        needsAction: true,
        message: 'Refreshing your session...',
        actionType: 'refresh',
      };
    default:
      return {
        isAuthenticated: false,
        needsAction: true,
        message: result.error || 'Authentication error occurred.',
        actionType: 'error',
      };
  }
};

/**
 * Utility function for components to check authentication and handle re-login flow
 * This is a simpler alternative to the more complex handleAuthenticationWithRecovery
 *
 * @returns Object with authentication status and user-friendly guidance
 */
export const checkAuthForComponent = async (): Promise<{
  isAuthenticated: boolean;
  needsReauth: boolean;
  message?: string;
  user?: any;
}> => {
  try {
    const authResult = await authHelpers.isAuthenticated();

    // Handle boolean response (legacy)
    if (typeof authResult === 'boolean') {
      return {
        isAuthenticated: authResult,
        needsReauth: !authResult,
        message: authResult ? undefined : 'Please log in to continue',
      };
    }

    // Handle AuthenticationResult response (new)
    return {
      isAuthenticated: authResult.authenticated,
      needsReauth: authResult.needsReauth || false,
      message: authResult.error,
      user: authResult.user,
    };
  } catch (error) {
    return {
      isAuthenticated: false,
      needsReauth: true,
      message: 'Authentication check failed. Please try logging in again.',
    };
  }
};
