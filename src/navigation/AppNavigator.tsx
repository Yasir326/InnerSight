import type React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

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

export type RootStackParamList = {
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
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const isOnboardingComplete = true; // TODO should come from app state/storage

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isOnboardingComplete ? 'Home' : 'Welcome'}
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
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
