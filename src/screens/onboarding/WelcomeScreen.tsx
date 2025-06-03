'use client';

import type React from 'react';
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
import { useRef } from 'react';
import { useEffect } from 'react';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Welcome'>;
};

const WelcomeScreen: React.FC<Props> = ({navigation}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

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
          <Text style={styles.emoji}>🎉</Text>
          <Text style={styles.title}>Congratulations!</Text>
          <Text style={styles.subtitle}>
            You've made an incredible decision to start your journaling journey.
          </Text>
          <Text style={styles.description}>
            Taking time for self-reflection is one of the most powerful things
            you can do for your mental well-being and personal growth.
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
            style={styles.button}
            onPress={() => navigation.navigate('OnboardingName')}>
            <Text style={styles.buttonText}>Let's Get Started</Text>
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
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 24,
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
    paddingHorizontal: 16,
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

export default WelcomeScreen;
