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
  TextInput,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../navigation/AppNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {safeAwait} from '../../utils/safeAwait';

type Props = {
  navigation: NativeStackNavigationProp<
    RootStackParamList,
    'OnboardingReflection'
  >;
};

const reflectionQuestions = [
  {
    id: 'current_state',
    question: 'How would you describe your current state of mind?',
    placeholder: "Be honest about how you're feeling right now...",
  },
  {
    id: 'ideal_self',
    question: 'Who do you want to become through this journaling journey?',
    placeholder: 'Describe the person you aspire to be...',
  },
  {
    id: 'biggest_obstacle',
    question: "What's the biggest obstacle holding you back right now?",
    placeholder: 'What patterns or habits are you ready to change?',
  },
];

const OnboardingReflectionScreen: React.FC<Props> = ({navigation}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const currentQuestion = reflectionQuestions[currentQuestionIndex];
  const isLastQuestion =
    currentQuestionIndex === reflectionQuestions.length - 1;
  const canContinue = answers[currentQuestion.id]?.trim().length > 0;

  const handleNext = async () => {
    if (isLastQuestion) {
      // Save reflection answers to AsyncStorage before completing
      const reflectionData = {
        current_state: answers.current_state || '',
        ideal_self: answers.ideal_self || '',
        biggest_obstacle: answers.biggest_obstacle || '',
      };
      
      const [error] = await safeAwait(
        AsyncStorage.setItem('@journal_onboarding_reflections', JSON.stringify(reflectionData))
      );
      
      if (error) {
        console.error('Error saving reflections:', error);
      }
      
      navigation.navigate('OnboardingComplete');
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const updateAnswer = (text: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: text,
    }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${
                      ((currentQuestionIndex + 1) /
                        reflectionQuestions.length) *
                      100
                    }%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {currentQuestionIndex + 1} of {reflectionQuestions.length}
            </Text>
          </View>

          <Text style={styles.title}>Let's reflect together</Text>
          <Text style={styles.subtitle}>
            These questions will help you think deeply about your journey. Take
            your time.
          </Text>
        </View>

        <View style={styles.questionContainer}>
          <Text style={styles.question}>{currentQuestion.question}</Text>

          <TextInput
            style={styles.textInput}
            multiline
            placeholder={currentQuestion.placeholder}
            placeholderTextColor="#999"
            value={answers[currentQuestion.id] || ''}
            onChangeText={updateAnswer}
            textAlignVertical="top"
          />

          <Text style={styles.encouragement}>
            💡 Remember: There are no wrong answers. This is your safe space to
            be completely honest.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          {currentQuestionIndex > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.button,
              !canContinue && styles.buttonDisabled,
              currentQuestionIndex === 0 && styles.buttonFullWidth,
            ]}
            onPress={handleNext}
            disabled={!canContinue}>
            <Text
              style={[
                styles.buttonText,
                !canContinue && styles.buttonTextDisabled,
              ]}>
              {isLastQuestion ? 'Complete' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
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
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: 4,
    backgroundColor: '#111',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'System',
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
  questionContainer: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  question: {
    fontSize: 22,
    fontWeight: '600',
    color: '#111',
    marginBottom: 24,
    lineHeight: 30,
    fontFamily: 'System',
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 17,
    color: '#111',
    minHeight: 120,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    fontFamily: 'System',
    lineHeight: 24,
  },
  encouragement: {
    fontSize: 15,
    color: '#666',
    marginTop: 16,
    fontStyle: 'italic',
    fontFamily: 'System',
    lineHeight: 22,
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
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#111',
  },
  backButtonText: {
    color: '#111',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'System',
  },
  button: {
    flex: 2,
    backgroundColor: '#111',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonFullWidth: {
    flex: 1,
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

export default OnboardingReflectionScreen;
