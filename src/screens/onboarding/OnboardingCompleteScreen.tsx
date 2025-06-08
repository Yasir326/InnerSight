'use client';

import type React from 'react';
import {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../navigation/AppNavigator';
import {storage} from '../../services/storage';

type Props = {
  navigation: NativeStackNavigationProp<
    RootStackParamList,
    'OnboardingComplete'
  >;
};

const OnboardingCompleteScreen: React.FC<Props> = ({navigation}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim, slideAnim ]);

  const handleStartJourney = async () => {
    try {
      // Mark onboarding as complete
      await storage.setOnboardingComplete();

      // Navigate to home and reset navigation stack
      navigation.reset({
        index: 0,
        routes: [{name: 'Home'}],
      });
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // Still navigate to home even if saving fails
      navigation.reset({
        index: 0,
        routes: [{name: 'Home'}],
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.iconContainer,
            {
              opacity: fadeAnim,
              transform: [{scale: scaleAnim}],
            },
          ]}>
          <Text style={styles.successIcon}>✨</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: fadeAnim,
              transform: [{translateY: slideAnim}],
            },
          ]}>
          <Text style={styles.title}>You're all set!</Text>
          <Text style={styles.subtitle}>
            Your journey of self-discovery begins now.
          </Text>
          <Text style={styles.description}>
            Remember, every small step counts. Your AI companion is here to
            guide you through meaningful reflections and help you uncover
            insights about yourself.
          </Text>

          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>Quick tips to get started:</Text>
            <Text style={styles.tip}>• Write freely without judgment</Text>
            <Text style={styles.tip}>• Be honest about your feelings</Text>
            <Text style={styles.tip}>• Trust the process</Text>
            <Text style={styles.tip}>• Come back daily for best results</Text>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.buttonContainer,
            {
              opacity: fadeAnim,
              transform: [{translateY: slideAnim}],
            },
          ]}>
          <TouchableOpacity style={styles.button} onPress={handleStartJourney}>
            <Text style={styles.buttonText}>Start My Journey</Text>
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
  iconContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  successIcon: {
    fontSize: 80,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 20,
    color: '#111',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'System',
    lineHeight: 28,
  },
  description: {
    fontSize: 17,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'System',
    marginBottom: 32,
  },
  tipsContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: '100%',
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    marginBottom: 12,
    fontFamily: 'System',
  },
  tip: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    fontFamily: 'System',
    lineHeight: 22,
  },
  buttonContainer: {
    paddingBottom: 20,
  },
  button: {
    backgroundColor: '#111',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'System',
  },
});

export default OnboardingCompleteScreen;
