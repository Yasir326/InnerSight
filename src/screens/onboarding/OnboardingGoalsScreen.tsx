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

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'OnboardingGoals'>;
};

const goals = [
  {
    id: 'stress',
    title: 'Reduce Stress & Anxiety',
    description: 'Find calm through daily reflection',
    icon: '🧘‍♀️',
  },
  {
    id: 'growth',
    title: 'Personal Growth',
    description: 'Understand yourself better',
    icon: '🌱',
  },
  {
    id: 'gratitude',
    title: 'Practice Gratitude',
    description: 'Focus on the positive',
    icon: '🙏',
  },
  {
    id: 'clarity',
    title: 'Mental Clarity',
    description: 'Organize your thoughts',
    icon: '💭',
  },
  {
    id: 'habits',
    title: 'Build Better Habits',
    description: 'Track your daily progress',
    icon: '✅',
  },
  {
    id: 'creativity',
    title: 'Boost Creativity',
    description: 'Unlock your creative potential',
    icon: '🎨',
  },
  {
    id: 'other',
    title: 'Other',
    description: 'Something else',
    icon: '💭',
  },
];

const OnboardingGoalsScreen: React.FC<Props> = ({navigation}) => {
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  const toggleGoal = (goalId: string) => {
    setSelectedGoals(prev =>
      prev.includes(goalId)
        ? prev.filter(id => id !== goalId)
        : [...prev, goalId],
    );
  };

  const canContinue = selectedGoals.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>What brings you here?</Text>
          <Text style={styles.subtitle}>
            Select what you'd like to achieve through journaling. This helps us
            personalize your experience.
          </Text>
        </View>

        <View style={styles.goalsContainer}>
          {goals.map(goal => (
            <TouchableOpacity
              key={goal.id}
              style={[
                styles.goalCard,
                selectedGoals.includes(goal.id) && styles.goalCardSelected,
              ]}
              onPress={() => toggleGoal(goal.id)}>
              <Text style={styles.goalIcon}>{goal.icon}</Text>
              <View style={styles.goalText}>
                <Text
                  style={[
                    styles.goalTitle,
                    selectedGoals.includes(goal.id) && styles.goalTitleSelected,
                  ]}>
                  {goal.title}
                </Text>
                <Text
                  style={[
                    styles.goalDescription,
                    selectedGoals.includes(goal.id) &&
                      styles.goalDescriptionSelected,
                  ]}>
                  {goal.description}
                </Text>
              </View>
              <View
                style={[
                  styles.checkbox,
                  selectedGoals.includes(goal.id) && styles.checkboxSelected,
                ]}>
                {selectedGoals.includes(goal.id) && (
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
          onPress={() =>
            canContinue && navigation.navigate('OnboardingChallenges')
          }
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
  goalsContainer: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  goalCardSelected: {
    borderColor: '#111',
    backgroundColor: '#f8f8f8',
  },
  goalIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  goalText: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
    fontFamily: 'System',
  },
  goalTitleSelected: {
    color: '#111',
  },
  goalDescription: {
    fontSize: 15,
    color: '#666',
    fontFamily: 'System',
  },
  goalDescriptionSelected: {
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

export default OnboardingGoalsScreen;
