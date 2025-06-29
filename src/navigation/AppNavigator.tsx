import React, {useState, useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {View, Text, ActivityIndicator, StyleSheet} from 'react-native';
import {safeAwait} from '../utils/safeAwait';
import {debugLog} from '../utils/logger';

// Auth Component
import {Auth} from '../components/Auth';

// Onboarding Screens
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import OnboardingNameScreen from '../screens/onboarding/OnboardingNameScreen';
import OnboardingGoalsScreen from '../screens/onboarding/OnboardingGoalsScreen';
import OnboardingChallengesScreen from '../screens/onboarding/OnboardingChallengesScreen';
import OnboardingReflectionScreen from '../screens/onboarding/OnboardingReflectionScreen';
import OnboardingCompleteScreen from '../screens/onboarding/OnboardingCompleteScreen';

// Main App Screens
import HomeScreen from '../screens/HomeScreen';
import EntryScreen from '../screens/EntryScreen';
import EntryDetailScreen from '../screens/EntryDetailScreen';
import AnalysisScreen from '../screens/AnalysisScreen';
import StatsScreen from '../screens/StatsScreen';
import ResultsScreen from '../screens/ResultsScreen';
import AccountScreen from '../screens/AccountScreen';

// Services
import {storageService} from '../services/storage';
import * as SupabaseModule from '../lib/supabase';

const {authHelpers} = SupabaseModule;

export type RootStackParamList = {
  // Auth
  Auth: undefined;

  // Onboarding
  Welcome: undefined;
  OnboardingName: undefined;
  OnboardingGoals: undefined;
  OnboardingChallenges: undefined;
  OnboardingReflection: undefined;
  OnboardingComplete: undefined;

  // Main App
  Home: undefined;
  Entry: undefined;
  EntryDetail: {entryId: string};
  Analysis: {
    entryText: string;
    entryId?: string;
    skipAI?: boolean; // Flag to skip AI analysis when coming from existing entry
    entryTitle?: string; // Include entry title for display
  };
  Stats: undefined;
  Results: undefined;
  Account: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Loading Screen Component
const LoadingScreen: React.FC<{message?: string}> = ({
  message = 'Loading...',
}) => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#3B82F6" />
    <Text style={styles.loadingText}>{message}</Text>
  </View>
);

const AppNavigator: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');

  // Authentication state listener
  useEffect(() => {
    console.log('🔗 Setting up auth state listener...');

    const {
      data: {subscription},
    } = authHelpers.onAuthStateChange((event, session) => {
      console.log(
        '🔄 Auth state changed:',
        event,
        session ? 'Session exists' : 'No session',
      );

      if (event === 'SIGNED_OUT' || !session) {
        console.log('👋 User signed out, updating state...');
        setIsAuthenticated(false);
        setOnboardingComplete(null);
      } else if (event === 'SIGNED_IN' && session) {
        console.log('👋 User signed in, updating state...');
        setIsAuthenticated(true);
        // Don't reset onboarding status here, let handleAuthSuccess handle it
      }
    });

    return () => {
      console.log('🔗 Cleaning up auth state listener...');
      subscription.unsubscribe();
    };
  }, []);

  // Initial authentication and onboarding check
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoadingMessage('Checking authentication...');

        const [authError, authResult] = await safeAwait(
          authHelpers.isAuthenticated(),
        );

        if (authError) {
          console.error('❌ Error checking authentication:', authError);
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        // Handle the new authentication response format
        let authenticated: boolean;
        if (typeof authResult === 'boolean') {
          authenticated = authResult;
        } else {
          // authResult is AuthenticationResult
          authenticated = authResult.authenticated;

          // If authentication failed and user needs to re-authenticate
          if (!authenticated && authResult.needsReauth) {
            if (__DEV__) {
              debugLog('🔄 Session expired, user needs to re-authenticate');
            }
            // You could show a toast/alert here if desired
            // Alert.alert('Session Expired', authResult.error || 'Please log in again');
          }
        }

        setIsAuthenticated(authenticated);

        if (authenticated) {
          setLoadingMessage('Checking onboarding status...');

          const [onboardingError, complete] = await safeAwait(
            storageService.isOnboardingComplete(),
          );

          if (onboardingError) {
            console.error(
              '❌ Error checking onboarding status:',
              onboardingError,
            );
            setOnboardingComplete(false);
          } else {
            setOnboardingComplete(complete);
          }
        }
      } catch (error) {
        console.error('❌ Error in app initialization:', error);
        setIsAuthenticated(false);
        setOnboardingComplete(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  const handleAuthSuccess = async () => {
    if (__DEV__) {
      debugLog('🎉 Auth success callback triggered');
    }
    setIsAuthenticated(true);
    // Check onboarding status after successful auth
    try {
      if (__DEV__) {
        debugLog('📋 Checking onboarding status after auth success...');
      }
      const complete = await Promise.race([
        storageService.isOnboardingComplete(),
        new Promise<boolean>((_, reject) =>
          setTimeout(
            () => reject(new Error('Onboarding check timeout')),
            10000,
          ),
        ),
      ]);
      if (__DEV__) {
        debugLog('✅ Onboarding status retrieved:', complete);
      }
      setOnboardingComplete(complete);
    } catch (error) {
      console.error('❌ Error checking onboarding status:', error);
      // Default to false if there's an error
      setOnboardingComplete(false);
    }
  };

  // Show loading screen during initial setup
  if (isLoading) {
    if (__DEV__) {
      debugLog('⏳ Showing loading screen:', loadingMessage);
    }
    return <LoadingScreen message={loadingMessage} />;
  }

  // Show loading state while checking auth status
  if (isAuthenticated === null) {
    if (__DEV__) {
      debugLog('⏳ Auth status still null, showing loading...');
    }
    return <LoadingScreen message="Checking authentication..." />;
  }

  // If not authenticated, show auth screen
  if (!isAuthenticated) {
    if (__DEV__) {
      debugLog('🔐 Showing auth screen');
    }
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{headerShown: false}}>
          <Stack.Screen name="Auth">
            {() => <Auth onAuthSuccess={handleAuthSuccess} />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // If authenticated but onboarding status is still loading
  if (onboardingComplete === null) {
    if (__DEV__) {
      debugLog('⏳ Onboarding status still loading...');
    }
    return <LoadingScreen message="Setting up your experience..." />;
  }

  if (__DEV__) {
    debugLog(
      '🚀 Showing main app, onboarding complete:',
      onboardingComplete,
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={onboardingComplete ? 'Home' : 'Welcome'}
        screenOptions={{
          headerShown: false,
          gestureEnabled: false, // Disable swipe back during onboarding
        }}>
        {/* Onboarding Flow */}
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen
          name="OnboardingName"
          component={OnboardingNameScreen}
          options={{gestureEnabled: true}}
        />
        <Stack.Screen
          name="OnboardingGoals"
          component={OnboardingGoalsScreen}
        />
        <Stack.Screen
          name="OnboardingChallenges"
          component={OnboardingChallengesScreen}
        />
        <Stack.Screen
          name="OnboardingReflection"
          component={OnboardingReflectionScreen}
        />
        <Stack.Screen
          name="OnboardingComplete"
          component={OnboardingCompleteScreen}
        />

        {/* Main App Flow */}
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{gestureEnabled: true}}
        />
        <Stack.Screen
          name="Entry"
          component={EntryScreen}
          options={{gestureEnabled: true}}
        />
        <Stack.Screen
          name="EntryDetail"
          component={EntryDetailScreen}
          options={{gestureEnabled: true}}
        />
        <Stack.Screen
          name="Analysis"
          component={AnalysisScreen}
          options={{gestureEnabled: true}}
        />
        <Stack.Screen
          name="Stats"
          component={StatsScreen}
          options={{gestureEnabled: true}}
        />
        <Stack.Screen
          name="Results"
          component={ResultsScreen}
          options={{gestureEnabled: true}}
        />
        <Stack.Screen
          name="Account"
          component={AccountScreen}
          options={{gestureEnabled: true}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default AppNavigator;
