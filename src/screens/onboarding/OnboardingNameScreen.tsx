'use client';

import type React from 'react';
import {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../navigation/AppNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {safeAwait} from '../../utils/safeAwait';
import {storageService} from '../../services/storage';
import {debugLog} from '../../utils/logger';

const USER_NAME_KEY = '@journal_user_name';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'OnboardingName'>;
};

const OnboardingNameScreen: React.FC<Props> = ({navigation}) => {
  const [name, setName] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const canContinue = name.trim().length > 0;

  const handleContinue = async () => {
    if (canContinue) {
      if (__DEV__) {
        debugLog('💾 Saving user name:', name.trim());
      }

      // Save the name to AsyncStorage for temporary storage during onboarding
      const [asyncError] = await safeAwait(
        AsyncStorage.setItem(USER_NAME_KEY, name.trim()),
      );

      if (asyncError) {
        console.error('Error saving user name to AsyncStorage:', asyncError);
      }

      // Also save to Supabase profile immediately
      try {
        const profileSuccess = await storageService.updateUserProfile({
          name: name.trim(),
        });

        if (profileSuccess) {
          if (__DEV__) {
            debugLog('✅ User name saved to profile successfully');
          }
        } else {
          console.warn(
            '⚠️ Failed to save user name to profile, but continuing...',
          );
        }
      } catch (error) {
        console.error('Error saving user name to profile:', error);
        // Don't block the user from continuing
      }

      navigation.navigate('OnboardingGoals');
    }
  };

  const handleSkip = async () => {
    if (__DEV__) {
      debugLog('⏭️ Skipping name entry');
    }

    // Save empty name or default when skipping
    const [asyncError] = await safeAwait(
      AsyncStorage.setItem(USER_NAME_KEY, ''),
    );

    if (asyncError) {
      console.error(
        'Error saving empty user name to AsyncStorage:',
        asyncError,
      );
    }

    navigation.navigate('OnboardingGoals');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: fadeAnim,
              transform: [{translateY: slideAnim}],
            },
          ]}>
          <Text style={styles.title}>What should we call you?</Text>
          <Text style={styles.subtitle}>
            We'd love to personalize your journaling experience. What name would
            you like us to use?
          </Text>

          <TextInput
            style={styles.nameInput}
            placeholder="Enter your name"
            placeholderTextColor="#BBBBBB"
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleContinue}
          />

          <Text style={styles.note}>
            Don't worry, you can always change this later in settings.
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.buttonContainer,
            {
              opacity: fadeAnim,
              transform: [{translateY: slideAnim}],
            },
          ]}>
          <TouchableOpacity
            style={[styles.button, !canContinue && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!canContinue}>
            <Text
              style={[
                styles.buttonText,
                !canContinue && styles.buttonTextDisabled,
              ]}>
              Continue
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 17,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'System',
    marginBottom: 40,
  },
  nameInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#111',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    fontFamily: 'System',
    textAlign: 'center',
    marginBottom: 16,
  },
  note: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: 'System',
  },
  buttonContainer: {
    paddingBottom: 20,
  },
  button: {
    backgroundColor: '#111',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'System',
  },
  buttonTextDisabled: {
    color: '#999',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#666',
    fontSize: 16,
    fontFamily: 'System',
  },
});

export default OnboardingNameScreen;
