'use client';

import type React from 'react';
import {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../navigation/AppNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {safeAwait} from '../../utils/safeAwait';

type Props = {
  navigation: NativeStackNavigationProp<
    RootStackParamList,
    'OnboardingChallenges'
  >;
};

const challenges = [
  {
    id: 'overwhelmed',
    title: 'Feeling Overwhelmed',
    description: 'Too many thoughts, not enough clarity',
    questions: [
      'What specific situations make you feel most overwhelmed?',
      'When did you last feel truly calm and centered?',
    ],
  },
  {
    id: 'stuck',
    title: 'Feeling Stuck',
    description: 'Same patterns, same problems',
    questions: [
      'What area of your life feels most stagnant right now?',
      'What would need to change for you to feel unstuck?',
    ],
  },
  {
    id: 'anxious',
    title: 'Anxiety & Worry',
    description: 'Racing thoughts and constant worry',
    questions: [
      'What thoughts keep you up at night?',
      'How does anxiety show up in your daily life?',
    ],
  },
  {
    id: 'direction',
    title: 'Lack of Direction',
    description: 'Unsure about goals and purpose',
    questions: [
      'What did you dream of becoming when you were younger?',
      'What activities make you lose track of time?',
    ],
  },
  {
    id: 'relationships',
    title: 'Relationship Issues',
    description: 'Struggling with connections',
    questions: [
      'What patterns do you notice in your relationships?',
      'How do you typically handle conflict?',
    ],
  },
  {
    id: 'confidence',
    title: 'Low Self-Confidence',
    description: 'Doubting yourself and your abilities',
    questions: [
      'When do you feel most confident and capable?',
      "What would you attempt if you knew you couldn't fail?",
    ],
  },
];

const OnboardingChallengesScreen: React.FC<Props> = ({navigation}) => {
  const [selectedChallenges, setSelectedChallenges] = useState<string[]>([]);

  const toggleChallenge = (challengeId: string) => {
    setSelectedChallenges(prev =>
      prev.includes(challengeId)
        ? prev.filter(id => id !== challengeId)
        : [...prev, challengeId],
    );
  };

  const canContinue = selectedChallenges.length > 0;

  const handleContinue = async () => {
    if (canContinue) {
      // Save selected challenges to AsyncStorage
      const [error] = await safeAwait(
        AsyncStorage.setItem('@journal_onboarding_challenges', JSON.stringify(selectedChallenges))
      );
      
      if (error) {
        console.error('Error saving challenges:', error);
      }
      
      navigation.navigate('OnboardingReflection');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>What challenges are you facing?</Text>
          <Text style={styles.subtitle}>
            It's brave to acknowledge what's difficult. Identifying these areas
            is the first step toward positive change.
          </Text>
        </View>

        <View style={styles.challengesContainer}>
          {challenges.map(challenge => (
            <TouchableOpacity
              key={challenge.id}
              style={[
                styles.challengeCard,
                selectedChallenges.includes(challenge.id) &&
                  styles.challengeCardSelected,
              ]}
              onPress={() => toggleChallenge(challenge.id)}>
              <View style={styles.challengeContent}>
                <Text
                  style={[
                    styles.challengeTitle,
                    selectedChallenges.includes(challenge.id) &&
                      styles.challengeTitleSelected,
                  ]}>
                  {challenge.title}
                </Text>
                <Text
                  style={[
                    styles.challengeDescription,
                    selectedChallenges.includes(challenge.id) &&
                      styles.challengeDescriptionSelected,
                  ]}>
                  {challenge.description}
                </Text>
              </View>
              <View
                style={[
                  styles.checkbox,
                  selectedChallenges.includes(challenge.id) &&
                    styles.checkboxSelected,
                ]}>
                {selectedChallenges.includes(challenge.id) && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
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
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 12,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 17,
    color: '#666',
    lineHeight: 24,
    fontFamily: 'System',
  },
  challengesContainer: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  challengeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  challengeCardSelected: {
    borderColor: '#111',
    backgroundColor: '#f8f8f8',
  },
  challengeContent: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
    fontFamily: 'System',
  },
  challengeTitleSelected: {
    color: '#111',
  },
  challengeDescription: {
    fontSize: 15,
    color: '#666',
    fontFamily: 'System',
  },
  challengeDescriptionSelected: {
    color: '#555',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  checkboxSelected: {
    backgroundColor: '#111',
    borderColor: '#111',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  button: {
    backgroundColor: '#111',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
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
});

export default OnboardingChallengesScreen;
