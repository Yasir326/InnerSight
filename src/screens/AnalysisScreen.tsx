'use client';

import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Animated,
  ScrollView,
  Platform,
  TouchableOpacity,
  Modal,
} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {
  analyseJournalEntry,
  analyzeJournalEntryData,
  generateAlternativePerspective,
  type AnalysisData,
} from '../services/ai';
import {safeAwait} from '../utils/safeAwait';
import {getAnalysisData, saveAnalysisData} from '../services/journalEntries';
import {getUserName} from '../services/onboarding';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Analysis'>;

// Icon Components
const BrainIcon: React.FC<{size?: number; color?: string}> = ({
  size = 16,
  color = '#6B7280',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9.5 2A2.5 2.5 0 0 0 7 4.5v15A2.5 2.5 0 0 0 9.5 22h5a2.5 2.5 0 0 0 2.5-2.5v-15A2.5 2.5 0 0 0 14.5 2h-5Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 6v12M9 9h6M9 15h6"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const HeartIcon: React.FC<{size?: number; color?: string}> = ({
  size = 16,
  color = '#6B7280',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const LightbulbIcon: React.FC<{size?: number; color?: string}> = ({
  size = 16,
  color = '#6B7280',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 21h6M12 3a6 6 0 0 0-6 6c0 1 .2 2 .6 2.8L9 15h6l2.4-3.2c.4-.8.6-1.8.6-2.8a6 6 0 0 0-6-6Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TrendingUpIcon: React.FC<{size?: number; color?: string}> = ({
  size = 16,
  color = '#6B7280',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22 7 13.5 15.5 8.5 10.5 2 17"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M16 7h6v6"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Custom Home Icon Component
const HomeIcon: React.FC<{size?: number; color?: string}> = ({
  size = 24,
  color = '#FFFFFF',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </Svg>
);

// Custom Journal Icon Component
const JournalIcon: React.FC<{size?: number; color?: string}> = ({
  size = 24,
  color = '#FFFFFF',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
  </Svg>
);

const AnalysisScreen: React.FC<Props> = ({route, navigation}) => {
  const {entryText, entryId, skipAI = false} = route.params;

  // loading for charts vs AI
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [loadingAI, setLoadingAI] = useState(true);
  const [loadingPerspective, setLoadingPerspective] = useState(true);

  // stream‐in the AI's response here
  const [aiText, setAiText] = useState('');

  // AI analysis data
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);

  // Alternative perspective
  const [alternativePerspective, setAlternativePerspective] =
    useState<string>('');

  // User's name for personalization
  const [userName, setUserName] = useState<string>('');

  // Theme detail modal state
  const [selectedTheme, setSelectedTheme] = useState<{
    name: string;
    count: number;
    breakdown: string;
    insights: string[];
    emoji: string;
  } | null>(null);
  const [showThemeModal, setShowThemeModal] = useState(false);


  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // Load user name for personalization
  useEffect(() => {
    const loadUserName = async () => {
      const [error, name] = await safeAwait(getUserName());
      if (error) {
        console.warn('Failed to load user name:', error);
      } else {
        setUserName(name || '');
      }
    };
    loadUserName();
  }, []);

  // Theme icon mapping
  const getThemeIcon = (themeName: string) => {
    switch (themeName.toLowerCase()) {
      case 'self-reflection':
        return BrainIcon;
      case 'emotions':
        return HeartIcon;
      case 'relationships':
        return LightbulbIcon;
      case 'daily life':
        return TrendingUpIcon;
      default:
        return BrainIcon;
    }
  };

  // Theme color mapping
  const getThemeColors = (themeName: string) => {
    switch (themeName.toLowerCase()) {
      case 'self-reflection':
        return {
          background: '#DBEAFE',
          text: '#1E40AF',
          border: '#BFDBFE',
        };
      case 'daily life':
        return {
          background: '#DCFCE7',
          text: '#166534',
          border: '#BBF7D0',
        };
      case 'emotions':
        return {
          background: '#F3E8FF',
          text: '#7C3AED',
          border: '#DDD6FE',
        };
      case 'relationships':
        return {
          background: '#FED7AA',
          text: '#C2410C',
          border: '#FDBA74',
        };
      default:
        return {
          background: '#F3F4F6',
          text: '#374151',
          border: '#D1D5DB',
        };
    }
  };


  useEffect(() => {
    if (skipAI && entryId) {
      // Load stored analysis data for existing entries
      const loadStoredData = async () => {
        const [error, storedData] = await safeAwait(getAnalysisData(entryId));

        if (error || !storedData.analysisData) {
          console.error(
            'Error loading stored analysis data or no data exists:',
            error,
          );
          // If no stored data exists, generate fresh analysis even for existing entries
          console.log(
            'No stored analysis data found, generating fresh analysis...',
          );

          const [analysisError, analysisData] = await safeAwait(
            analyzeJournalEntryData(entryText),
          );
          const [perspectiveError, perspective] = await safeAwait(
            generateAlternativePerspective(entryText),
          );
          const [insightsError, insights] = await safeAwait(
            analyseJournalEntry(entryText),
          );

          if (analysisError) {
            console.error('Error generating analysis:', analysisError);
            // Only use fallback if AI generation fails
            setAnalysisData({
              themes: [
                {
                  name: 'Self-Reflection',
                  count: 4,
                  breakdown: 'Your entry shows deep introspection and willingness to examine your thoughts and feelings.',
                  insights: [
                    'You demonstrate strong self-awareness',
                    "You're actively processing your experiences",
                    'You show courage in facing difficult emotions',
                  ],
                  emoji: '🤔'
                },
                {
                  name: 'Daily Life',
                  count: 3,
                  breakdown: "You're navigating the complexities of everyday experiences and finding meaning in routine moments.",
                  insights: [
                    'You notice details in your daily experiences',
                    'You seek meaning in ordinary moments',
                    "You're building awareness of life patterns",
                  ],
                  emoji: '📅'
                },
                {
                  name: 'Emotions',
                  count: 3,
                  breakdown: 'Your emotional landscape is rich and varied, showing both vulnerability and strength.',
                  insights: [
                    'You acknowledge your feelings honestly',
                    "You're developing emotional intelligence",
                    'You show resilience in processing emotions',
                  ],
                  emoji: '💭'
                },
                {
                  name: 'Relationships',
                  count: 2,
                  breakdown: 'Your connections with others play an important role in your personal growth and well-being.',
                  insights: [
                    'You value meaningful connections',
                    "You're learning about interpersonal dynamics",
                    'You seek understanding in your relationships',
                  ],
                  emoji: '❤️'
                },
              ],
              emotions: [
                {name: 'Contemplative', percentage: 40, color: '#64748B'},
                {name: 'Hopeful', percentage: 30, color: '#3B82F6'},
                {name: 'Uncertain', percentage: 20, color: '#F59E0B'},
                {name: 'Grateful', percentage: 10, color: '#10B981'},
              ],
              perspective:
                'Your willingness to write and reflect shows incredible self-awareness and courage.',
            });
          } else {
            setAnalysisData(analysisData);
          }

          if (perspectiveError) {
            console.error('Error generating perspective:', perspectiveError);
            setAlternativePerspective(
              'Every experience, even difficult ones, offers opportunities for growth and self-discovery. Your willingness to reflect shows strength and wisdom.',
            );
          } else {
            setAlternativePerspective(perspective);
          }

          if (insightsError) {
            console.error('Error generating insights:', insightsError);
            setAiText(
              'Unable to generate insights at this time. Please try again later.',
            );
          } else {
            setAiText(insights);
          }

          // Save the generated analysis data for future use
          if (!analysisError && !perspectiveError && !insightsError) {
            const [saveError] = await safeAwait(
              saveAnalysisData(entryId, analysisData, perspective, insights),
            );
            if (saveError) {
              console.error('Error saving generated analysis data:', saveError);
            }
          }
        } else {
          // Use stored data
          setAnalysisData(storedData.analysisData);
          setAlternativePerspective(
            storedData.alternativePerspective ||
              'Every experience, even difficult ones, offers opportunities for growth and self-discovery. Your willingness to reflect shows strength and wisdom.',
          );
          setAiText(
            storedData.aiInsights ||
              'This analysis was generated from your saved journal entry. Create a new entry to get fresh AI insights!',
          );
        }

        setLoadingCharts(false);
        setLoadingPerspective(false);
        setLoadingAI(false);
      };

      loadStoredData();
      return;
    }

    // Generate new analysis for new entries
    const loadAnalysisData = async () => {
      const [error, data] = await safeAwait(analyzeJournalEntryData(entryText));

      if (error) {
        console.error('Error analyzing journal entry:', error);
        // Use fallback data only if AI generation fails
        setAnalysisData({
          themes: [
            {
              name: 'Self-Reflection',
              count: 4,
              breakdown: 'Your entry shows deep introspection and willingness to examine your thoughts and feelings.',
              insights: [
                'You demonstrate strong self-awareness',
                "You're actively processing your experiences",
                'You show courage in facing difficult emotions',
              ],
              emoji: '🤔'
            },
            {
              name: 'Daily Life',
              count: 3,
              breakdown: "You're navigating the complexities of everyday experiences and finding meaning in routine moments.",
              insights: [
                'You notice details in your daily experiences',
                'You seek meaning in ordinary moments',
                "You're building awareness of life patterns",
              ],
              emoji: '📅'
            },
            {
              name: 'Emotions',
              count: 3,
              breakdown: 'Your emotional landscape is rich and varied, showing both vulnerability and strength.',
              insights: [
                'You acknowledge your feelings honestly',
                "You're developing emotional intelligence",
                'You show resilience in processing emotions',
              ],
              emoji: '💭'
            },
            {
              name: 'Relationships',
              count: 2,
              breakdown: 'Your connections with others play an important role in your personal growth and well-being.',
              insights: [
                'You value meaningful connections',
                "You're learning about interpersonal dynamics",
                'You seek understanding in your relationships',
              ],
              emoji: '❤️'
            },
          ],
          emotions: [
            {name: 'Contemplative', percentage: 40, color: '#64748B'},
            {name: 'Hopeful', percentage: 30, color: '#3B82F6'},
            {name: 'Uncertain', percentage: 20, color: '#F59E0B'},
            {name: 'Grateful', percentage: 10, color: '#10B981'},
          ],
          perspective:
            'Your willingness to write and reflect shows incredible self-awareness and courage.',
        });
      } else {
        setAnalysisData(data);
      }

      setLoadingCharts(false);
    };

    const timer = setTimeout(() => {
      loadAnalysisData();
    }, 2000);

    return () => clearTimeout(timer);
  }, [entryText, skipAI, entryId]);

  // Load alternative perspective
  useEffect(() => {
    if (skipAI) {
      // Already loaded in the main useEffect above
      return;
    }

    if (!loadingCharts) {
      const loadPerspective = async () => {
        const [error, perspective] = await safeAwait(
          generateAlternativePerspective(entryText),
        );

        if (error) {
          console.error('Error generating alternative perspective:', error);
          setAlternativePerspective(
            'Every experience, even difficult ones, offers opportunities for growth and self-discovery. Your willingness to reflect shows strength and wisdom.',
          );
        } else {
          setAlternativePerspective(perspective);
        }

        setLoadingPerspective(false);
      };

      loadPerspective();
    }
  }, [loadingCharts, entryText, skipAI]);

  // once charts are done, fire off the AI insights
  useEffect(() => {
    if (skipAI) {
      // Already loaded in the main useEffect above
      return;
    }

    if (!loadingCharts) {
      const getAIInsights = async () => {
        const [error, insights] = await safeAwait(
          analyseJournalEntry(entryText),
        );

        if (error) {
          console.error('Error getting AI insights:', error);
          setAiText(
            'Unable to generate insights at this time. Please try again later.',
          );
        } else {
          setAiText(insights);
        }

        setLoadingAI(false);
      };

      getAIInsights();
    }
  }, [loadingCharts, entryText, skipAI]);

  // Save analysis data when all AI processing is complete (for new entries)
  useEffect(() => {
    if (
      !skipAI &&
      entryId &&
      !loadingCharts &&
      !loadingPerspective &&
      !loadingAI &&
      analysisData
    ) {
      const saveData = async () => {
        const [error] = await safeAwait(
          saveAnalysisData(
            entryId,
            analysisData,
            alternativePerspective,
            aiText,
          ),
        );

        if (error) {
          console.error('Error saving analysis data:', error);
        }
      };

      saveData();
    }
  }, [
    skipAI,
    entryId,
    loadingCharts,
    loadingPerspective,
    loadingAI,
    analysisData,
    alternativePerspective,
    aiText,
  ]);

  // Helper function to handle theme press
  const handleThemePress = (theme: {
    name: string;
    count: number;
    breakdown: string;
    insights: string[];
    emoji: string;
  }) => {
    setSelectedTheme(theme);
    setShowThemeModal(true);
  };

  // Helper function to close theme modal
  const closeThemeModal = () => {
    setShowThemeModal(false);
    setSelectedTheme(null);
  };

  // Parse AI insights into individual insights
  const parseAIInsights = (text: string) => {
    // Split by common delimiters and filter out empty strings
    const insights = text
      .split(/\n\n|\. (?=[A-Z])|(?:\d+\.\s)/)
      .filter(insight => insight.trim().length > 0)
      .map(insight => insight.trim().replace(/^\d+\.\s*/, ''))
      .slice(0, 3); // Limit to 3 insights for better UI

    return insights.length > 0 ? insights : [text];
  };

  // Helper function to personalize insights
  const personalizeInsight = (insight: string, userName: string | null): string => {
    if (!userName) return insight;
    
    // Check if insight already starts with "You" or similar personal pronouns
    const startsWithYou = /^(You|Your)\s/i.test(insight);
    
    if (startsWithYou) {
      // Replace "You" with the user's name
      return insight.replace(/^You\s/i, `${userName}, you `).replace(/^Your\s/i, `${userName}, your `);
    } else {
      // Add the user's name at the beginning for other insights
      return `${userName}, ${insight.toLowerCase()}`;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analysis</Text>
          <Text style={styles.headerSubtitle}>Your journal insights</Text>
        </View>

        {loadingCharts ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#000000" />
            <Text style={styles.loadingTitle}>Analyzing your entry</Text>
            <Text style={styles.loadingSubtitle}>
              Finding themes and emotions...
            </Text>
            <View style={styles.progressBarBackground}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          </View>
        ) : (
          <>
            {/* Themes Section */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Themes</Text>
                <Text style={styles.cardSubtitle}>
                  Key topics in your entry
                </Text>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.themesGrid}>
                  {(analysisData?.themes || []).map((theme, index) => {
                    const IconComponent = getThemeIcon(theme.name);
                    const colors = getThemeColors(theme.name);
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[styles.themeCard, {borderColor: colors.border}]}
                        onPress={() => handleThemePress(theme)}>
                        <View style={styles.themeHeader}>
                          {theme.emoji ? (
                            <Text style={styles.themeEmoji}>{theme.emoji}</Text>
                          ) : (
                            <IconComponent size={16} color={colors.text} />
                          )}
                          <Text
                            style={[styles.themeName, {color: colors.text}]}>
                            {theme.name}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.themeBadge,
                            {
                              backgroundColor: colors.background,
                              borderColor: colors.border,
                            },
                          ]}>
                          <Text
                            style={[
                              styles.themeBadgeText,
                              {color: colors.text},
                            ]}>
                            {theme.count} mentions
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Emotions Section */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Emotion Breakdown</Text>
                <Text style={styles.cardSubtitle}>How you're feeling</Text>
              </View>
              <View style={styles.cardContent}>
                {(analysisData?.emotions || []).map((emotion, index) => (
                  <View key={index} style={styles.emotionItem}>
                    <View style={styles.emotionHeader}>
                      <Text style={styles.emotionName}>{emotion.name}</Text>
                      <Text style={styles.emotionPercent}>
                        {emotion.percentage}%
                      </Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <View style={styles.progressBarBackground}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: `${emotion.percentage}%`,
                              backgroundColor: emotion.color,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Alternative Perspective */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Alternative Perspective</Text>
              </View>
              <View style={styles.cardContent}>
                {loadingPerspective ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#000000" />
                    <Text style={styles.loadingText}>
                      Generating perspective...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.perspectiveCard}>
                    <Text style={styles.perspectiveText}>
                      {alternativePerspective}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* AI Insights */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>AI Insights</Text>
              </View>
              <View style={styles.cardContent}>
                {loadingAI ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#000000" />
                    <Text style={styles.loadingText}>
                      Generating insights...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.insightsContainer}>
                    {parseAIInsights(aiText).map((insight, index) => (
                      <View key={index} style={styles.insightCard}>
                        <Text style={styles.insightText}>{personalizeInsight(insight, userName)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Theme Detail Modal */}
      <Modal
        visible={showThemeModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeThemeModal}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedTheme?.name}</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={closeThemeModal}>
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedTheme && (
              <>
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>
                    {selectedTheme.emoji && (
                      <Text style={styles.modalEmoji}>{selectedTheme.emoji} </Text>
                    )}
                    Overview
                  </Text>
                  <Text style={styles.modalBreakdown}>
                    {userName 
                      ? `${userName}, ${selectedTheme.breakdown.toLowerCase()}`
                      : selectedTheme.breakdown
                    }
                  </Text>
                  <View style={styles.mentionsCard}>
                    <Text style={styles.mentionsText}>
                      This theme appeared <Text style={styles.mentionsCount}>{selectedTheme.count}</Text> times in your entry, 
                      {selectedTheme.count >= 4 
                        ? ' showing it\'s a significant focus for you right now.'
                        : selectedTheme.count >= 2
                        ? ' indicating it\'s moderately important in your current thoughts.'
                        : ' suggesting it\'s emerging in your awareness.'
                      }
                    </Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Key Insights</Text>
                  {selectedTheme.insights.map((insight, index) => (
                    <View key={index} style={styles.insightItem}>
                      <View style={styles.insightBullet} />
                      <Text style={styles.insightText}>{personalizeInsight(insight, userName)}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>
                    Reflection Questions
                  </Text>
                  <View style={styles.reflectionCard}>
                    <Text style={styles.reflectionText}>
                      {userName 
                        ? `${userName}, how does this theme show up in other areas of your life?`
                        : 'How does this theme show up in other areas of your life?'
                      }
                    </Text>
                  </View>
                  <View style={styles.reflectionCard}>
                    <Text style={styles.reflectionText}>
                      What patterns do you notice around{' '}
                      {selectedTheme.name.toLowerCase()}?
                    </Text>
                  </View>
                  {userName && (
                    <View style={styles.reflectionCard}>
                      <Text style={styles.reflectionText}>
                        {userName}, what would you tell a friend who was experiencing similar thoughts about {selectedTheme.name.toLowerCase()}?
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Floating Home Button */}
      <TouchableOpacity
        style={styles.homeButton}
        onPress={() => navigation.navigate('Home')}>
        <HomeIcon size={24} color="#FFFFFF" />
      </TouchableOpacity>
      {/* Floating Journal Button */}
      {entryId && (
        <TouchableOpacity
          style={styles.journalButton}
          onPress={() => navigation.navigate('EntryDetail', {entryId})}>
          <JournalIcon size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

export default AnalysisScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingBottom: 100, // Space for floating buttons
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    padding: 16,
    paddingBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  cardContent: {
    padding: 16,
    paddingTop: 0,
  },
  themesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  themeCard: {
    width: '47%',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  themeName: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  themeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  themeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  emotionItem: {
    marginBottom: 16,
  },
  emotionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  emotionName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  emotionPercent: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  progressBarContainer: {
    position: 'relative',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  perspectiveCard: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#60A5FA',
  },
  perspectiveText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  insightsContainer: {
    gap: 12,
  },
  insightCard: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  insightText: {
    fontSize: 14,
    color: '#374151',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  loadingSubtitle: {
    fontSize: 15,
    color: '#888888',
    marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  homeButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    backgroundColor: '#000000',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  journalButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 56,
    height: 56,
    backgroundColor: '#000000',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  modalCloseButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#000000',
    borderRadius: 20,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalSection: {
    marginVertical: 20,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  modalBreakdown: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333333',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  insightBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000000',
    marginTop: 8,
    marginRight: 12,
  },
  reflectionCard: {
    backgroundColor: '#F5F5F7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  reflectionText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#000000',
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  themeEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  modalEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  mentionsCard: {
    backgroundColor: '#F5F5F7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  mentionsText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  mentionsCount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
});
