import type React from 'react';
import {useState, useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {View, Text, ActivityIndicator, StyleSheet} from 'react-native';

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

// Debug the import
console.log('🔍 Supabase module contents:', Object.keys(SupabaseModule));
console.log('🔍 authHelpers type:', typeof SupabaseModule.authHelpers);

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

  useEffect(() => {
    const checkAuthAndOnboarding = async () => {
      try {
        console.log('🔍 Checking authentication status...');
        setLoadingMessage('Checking authentication...');

        // Check authentication status
        const authenticated = await authHelpers.isAuthenticated();
        console.log('🔐 Authentication status:', authenticated);

        setIsAuthenticated(authenticated);

        if (authenticated) {
          console.log('✅ User is authenticated, checking onboarding...');
          setLoadingMessage('Loading your profile...');
          // If authenticated, check onboarding status
          try {
            const complete = await Promise.race([
              storageService.isOnboardingComplete(),
              new Promise<boolean>((_, reject) => 
                setTimeout(() => reject(new Error('Onboarding check timeout')), 10000)
              )
            ]);
            console.log('📋 Onboarding complete:', complete);
            setOnboardingComplete(complete);
          } catch (error) {
            console.error('❌ Error checking onboarding status in useEffect:', error);
            // Default to false if there's an error
            setOnboardingComplete(false);
          }
        } else {
          console.log('❌ User is not authenticated');
          setOnboardingComplete(null);
        }
      } catch (error) {
        console.error('💥 Error checking auth/onboarding status:', error);
        setIsAuthenticated(false);
        setOnboardingComplete(null);
      } finally {
        setIsLoading(false);
        console.log('✅ Initial auth check complete');
      }
    };

    checkAuthAndOnboarding();

    // Listen for auth state changes
    console.log('👂 Setting up auth state listener...');
    const {
      data: {subscription},
    } = authHelpers.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, !!session);
      const authenticated = !!session;
      setIsAuthenticated(authenticated);

      if (authenticated) {
        // Check onboarding when user signs in
        try {
          const complete = await Promise.race([
            storageService.isOnboardingComplete(),
            new Promise<boolean>((_, reject) => 
              setTimeout(() => reject(new Error('Onboarding check timeout')), 10000)
            )
          ]);
          setOnboardingComplete(complete);
        } catch (error) {
          console.error('❌ Error checking onboarding in auth state change:', error);
          setOnboardingComplete(false);
        }
      } else {
        setOnboardingComplete(null);
      }
    });

    return () => {
      console.log('🧹 Cleaning up auth listener...');
      subscription?.unsubscribe();
    };
  }, []);

  const handleAuthSuccess = async () => {
    console.log('🎉 Auth success callback triggered');
    setIsAuthenticated(true);
    // Check onboarding status after successful auth
    try {
      console.log('📋 Checking onboarding status after auth success...');
      const complete = await Promise.race([
        storageService.isOnboardingComplete(),
        new Promise<boolean>((_, reject) => 
          setTimeout(() => reject(new Error('Onboarding check timeout')), 10000)
        )
      ]);
      console.log('✅ Onboarding status retrieved:', complete);
      setOnboardingComplete(complete);
    } catch (error) {
      console.error('❌ Error checking onboarding status:', error);
      // Default to false if there's an error
      setOnboardingComplete(false);
    }
  };

  // Show loading screen during initial setup
  if (isLoading) {
    console.log('⏳ Showing loading screen:', loadingMessage);
    return <LoadingScreen message={loadingMessage} />;
  }

  // Show loading state while checking auth status
  if (isAuthenticated === null) {
    console.log('⏳ Auth status still null, showing loading...');
    return <LoadingScreen message="Checking authentication..." />;
  }

  // If not authenticated, show auth screen
  if (!isAuthenticated) {
    console.log('🔐 Showing auth screen');
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
    console.log('⏳ Onboarding status still loading...');
    return <LoadingScreen message="Setting up your experience..." />;
  }

  console.log('🚀 Showing main app, onboarding complete:', onboardingComplete);

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
