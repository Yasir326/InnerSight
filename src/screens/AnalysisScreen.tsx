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
import {
  analyseJournalEntry,
  analyzeJournalEntryData,
  generateAlternativePerspective,
  type AnalysisData,
} from '../services/ai';
import {safeAwait} from '../utils/safeAwait';
import {getUserName} from '../services/onboarding';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/AppNavigator';
import {journalEntriesService} from '../services/journalEntries';
import {Path} from 'react-native-svg';
import Svg from 'react-native-svg';

type Props = NativeStackScreenProps<RootStackParamList, 'Analysis'>;

const JournalIcon: React.FC<{size?: number}> = ({size = 24}) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="#FFFFFF">
    <Path d="M5 10.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5zm0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z" />
    <Path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2z" />
    <Path d="M1 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0V8h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1z" />
  </Svg>
);

const HomeIcon: React.FC<{size?: number; color?: string}> = ({
  size = 24,
  color = '#FFFFFF',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
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
    color: string;
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

  // Theme color mapping
  const getThemeColor = (themeName: string) => {
    switch (themeName.toLowerCase()) {
      case 'self-reflection':
        return '#000000';
      case 'daily life':
        return '#333333';
      case 'emotions':
        return '#666666';
      case 'relationships':
        return '#999999';
      case 'work':
        return '#000000';
      case 'health':
        return '#333333';
      case 'growth':
        return '#666666';
      case 'creativity':
        return '#999999';
      default:
        return '#666666';
    }
  };

  useEffect(() => {
    if (skipAI && entryId) {
      // Load stored analysis data for existing entries
      const loadStoredData = async () => {
        const [error, storedData] = await safeAwait(
          journalEntriesService.getEntry(entryId),
        );

        if (error || !storedData?.analysisData) {
          console.error(
            'Error loading stored analysis data or no data exists:',
            error,
          );
          // If no stored data exists, generate fresh analysis even for existing entries
          if (__DEV__) {
            console.log(
              'No stored analysis data found, generating fresh analysis...',
            );
          }

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
                  breakdown:
                    'Your entry shows deep introspection and willingness to examine your thoughts and feelings.',
                  insights: [
                    'You demonstrate strong self-awareness',
                    "You're actively processing your experiences",
                    'You show courage in facing difficult emotions',
                  ],
                  emoji: '🤔',
                },
                {
                  name: 'Daily Life',
                  count: 3,
                  breakdown:
                    "You're navigating the complexities of everyday experiences and finding meaning in routine moments.",
                  insights: [
                    'You notice details in your daily experiences',
                    'You seek meaning in ordinary moments',
                    "You're building awareness of life patterns",
                  ],
                  emoji: '📅',
                },
                {
                  name: 'Emotions',
                  count: 3,
                  breakdown:
                    'Your emotional landscape is rich and varied, showing both vulnerability and strength.',
                  insights: [
                    'You acknowledge your feelings honestly',
                    "You're developing emotional intelligence",
                    'You show resilience in processing emotions',
                  ],
                  emoji: '💭',
                },
                {
                  name: 'Growth',
                  count: 2,
                  breakdown:
                    'Your connections with others play an important role in your personal growth and well-being.',
                  insights: [
                    'You value meaningful connections',
                    "You're learning about interpersonal dynamics",
                    'You seek understanding in your relationships',
                  ],
                  emoji: '🌱',
                },
              ],
              emotions: [
                {name: 'Contemplative', percentage: 40, color: '#000000'},
                {name: 'Hopeful', percentage: 30, color: '#333333'},
                {name: 'Uncertain', percentage: 20, color: '#666666'},
                {name: 'Grateful', percentage: 10, color: '#999999'},
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
              journalEntriesService.updateEntry(entryId, {
                analysisData,
                alternativePerspective: perspective,
                aiInsights: insights,
              }),
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
              breakdown:
                'Your entry shows deep introspection and willingness to examine your thoughts and feelings.',
              insights: [
                'You demonstrate strong self-awareness',
                "You're actively processing your experiences",
                'You show courage in facing difficult emotions',
              ],
              emoji: '🤔',
            },
            {
              name: 'Daily Life',
              count: 3,
              breakdown:
                "You're navigating the complexities of everyday experiences and finding meaning in routine moments.",
              insights: [
                'You notice details in your daily experiences',
                'You seek meaning in ordinary moments',
                "You're building awareness of life patterns",
              ],
              emoji: '📅',
            },
            {
              name: 'Emotions',
              count: 3,
              breakdown:
                'Your emotional landscape is rich and varied, showing both vulnerability and strength.',
              insights: [
                'You acknowledge your feelings honestly',
                "You're developing emotional intelligence",
                'You show resilience in processing emotions',
              ],
              emoji: '💭',
            },
            {
              name: 'Growth',
              count: 2,
              breakdown:
                'Your focus on personal development and learning is evident throughout your writing.',
              insights: [
                "You're committed to continuous improvement",
                'You see challenges as opportunities',
                'You value learning from experiences',
              ],
              emoji: '🌱',
            },
          ],
          emotions: [
            {name: 'Contemplative', percentage: 40, color: '#000000'},
            {name: 'Hopeful', percentage: 30, color: '#333333'},
            {name: 'Uncertain', percentage: 20, color: '#666666'},
            {name: 'Grateful', percentage: 10, color: '#999999'},
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
          journalEntriesService.updateEntry(entryId, {
            analysisData,
            alternativePerspective,
            aiInsights: aiText,
          }),
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
    const themeWithColor = {
      ...theme,
      color: getThemeColor(theme.name),
    };
    setSelectedTheme(themeWithColor);
    setShowThemeModal(true);
  };

  // Helper function to close theme modal
  const closeThemeModal = () => {
    setShowThemeModal(false);
    setSelectedTheme(null);
  };

  const getCurrentDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Helper function to personalize insights
  const personalizeInsight = (
    insight: string,
    userName: string | null,
  ): string => {
    if (!userName) return insight;

    let personalizedInsight = insight;

    // Handle patterns at the beginning of sentences
    const startsWithYou = /^(You|Your)\s/i.test(personalizedInsight);
    if (startsWithYou) {
      personalizedInsight = personalizedInsight
        .replace(/^You\s/i, `${userName}, you `)
        .replace(/^Your\s/i, `${userName}, your `);
    } else {
      personalizedInsight = personalizedInsight
        .replace(/\bthe writer\b/gi, userName)
        .replace(/\bthe person\b/gi, userName)
        .replace(/\bthe individual\b/gi, userName)
        .replace(/\bthe user\b/gi, userName)
        .replace(/\bthe author\b/gi, userName)
        .replace(/\bthe journaler\b/gi, userName)
        .replace(/\bthis person\b/gi, userName)
        .replace(/\bthis individual\b/gi, userName);

      if (personalizedInsight === insight) {
        personalizedInsight = `${userName}, ${insight.toLowerCase()}`;
      }
    }

    return personalizedInsight;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Analysis Complete</Text>
            <Text style={styles.headerSubtitle}>Your journal insights</Text>
          </View>
          <TouchableOpacity style={styles.menuButton}>
            <Text style={styles.menuDots}>⋯</Text>
          </TouchableOpacity>
        </View>

        {loadingCharts ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000000" />
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
          <View style={styles.content}>
            {/* Date and Summary */}
            <View style={styles.dateSection}>
              <Text style={styles.currentDate}>{getCurrentDate()}</Text>
              <Text style={styles.summary}>
                {analysisData?.themes?.length || 0} themes identified •{' '}
                {analysisData?.emotions?.length || 0} key emotions • Personal
                insights generated
              </Text>
            </View>

            {/* Themes Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>THEMES DISCOVERED</Text>
                <View style={styles.categoryCount}>
                  <Text style={styles.categoryCountText}>
                    {analysisData?.themes?.length || 0}
                  </Text>
                </View>
              </View>

              <View style={styles.themesGrid}>
                {(analysisData?.themes || []).map((theme, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.themeCard}
                    onPress={() => handleThemePress(theme)}>
                    <View style={styles.themeHeader}>
                      <View
                        style={[
                          styles.themeIcon,
                          {backgroundColor: getThemeColor(theme.name)},
                        ]}>
                        <Text style={styles.themeEmoji}>{theme.emoji}</Text>
                      </View>
                      <View style={styles.themeContent}>
                        <Text style={styles.themeName}>{theme.name}</Text>
                        <Text style={styles.themeDescription}>
                          {theme.count} mentions found
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.themeAmount,
                        {backgroundColor: getThemeColor(theme.name)},
                      ]}>
                      <Text style={styles.themeCount}>{theme.count}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Emotions Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>EMOTIONAL BREAKDOWN</Text>
                <View style={styles.categoryCount}>
                  <Text style={styles.categoryCountText}>
                    {analysisData?.emotions?.length || 0}
                  </Text>
                </View>
              </View>

              <View style={styles.emotionsContainer}>
                {(analysisData?.emotions || []).map((emotion, index) => (
                  <View key={index} style={styles.emotionItem}>
                    <View style={styles.emotionHeader}>
                      <View
                        style={[
                          styles.emotionDot,
                          {backgroundColor: emotion.color},
                        ]}
                      />
                      <Text style={styles.emotionName}>{emotion.name}</Text>
                    </View>
                    <View style={styles.emotionRight}>
                      <View style={styles.emotionBarContainer}>
                        <View style={styles.emotionBarBackground}>
                          <View
                            style={[
                              styles.emotionBarFill,
                              {
                                width: `${emotion.percentage}%`,
                                backgroundColor: emotion.color,
                              },
                            ]}
                          />
                        </View>
                      </View>
                      <Text style={styles.emotionPercent}>
                        {emotion.percentage}%
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* AI Insights */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>AI INSIGHTS</Text>
              </View>

              {loadingAI ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#000000" />
                  <Text style={styles.loadingText}>Generating insights...</Text>
                </View>
              ) : (
                <View style={styles.insightCard}>
                  <View style={styles.insightIcon}>
                    <Text style={styles.insightEmoji}>💡</Text>
                  </View>
                  <Text style={styles.insightText}>
                    {personalizeInsight(aiText, userName)}
                  </Text>
                </View>
              )}
            </View>

            {/* Alternative Perspective */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>ALTERNATIVE PERSPECTIVE</Text>
              </View>

              {loadingPerspective ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#000000" />
                  <Text style={styles.loadingText}>
                    Generating perspective...
                  </Text>
                </View>
              ) : (
                <View style={styles.perspectiveCard}>
                  <View style={styles.perspectiveIcon}>
                    <Text style={styles.perspectiveEmoji}>🔄</Text>
                  </View>
                  <Text style={styles.perspectiveText}>
                    {alternativePerspective}
                  </Text>
                </View>
              )}
            </View>
          </View>
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
            <TouchableOpacity
              style={styles.modalBackButton}
              onPress={closeThemeModal}>
              <Text style={styles.modalBackText}>←</Text>
            </TouchableOpacity>
            <View>
              <Text style={styles.modalTitle}>{selectedTheme?.name}</Text>
              <Text style={styles.modalSubtitle}>Theme details</Text>
            </View>
            <View style={styles.modalSpacer} />
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedTheme && (
              <>
                <View style={styles.modalThemeHeader}>
                  <View
                    style={[
                      styles.modalThemeIcon,
                      {backgroundColor: selectedTheme.color},
                    ]}>
                    <Text style={styles.modalThemeEmoji}>
                      {selectedTheme.emoji}
                    </Text>
                  </View>
                  <View style={styles.modalThemeInfo}>
                    <Text style={styles.modalThemeName}>
                      {selectedTheme.name}
                    </Text>
                    <Text style={styles.modalThemeCount}>
                      {selectedTheme.count} mentions in your entry
                    </Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Overview</Text>
                  <Text style={styles.modalBreakdown}>
                    {userName
                      ? `${userName}, ${selectedTheme.breakdown.toLowerCase()}`
                      : selectedTheme.breakdown}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Key Insights</Text>
                  {selectedTheme.insights.map(
                    (insight: string, index: number) => (
                      <View key={index} style={styles.modalInsightItem}>
                        <View style={styles.modalInsightDot} />
                        <Text style={styles.modalInsightText}>
                          {personalizeInsight(insight, userName)}
                        </Text>
                      </View>
                    ),
                  )}
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>
                    Reflection Questions
                  </Text>
                  <View style={styles.reflectionCard}>
                    <Text style={styles.reflectionText}>
                      {userName
                        ? `${userName}, how does this theme show up in other areas of your life?`
                        : 'How does this theme show up in other areas of your life?'}
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
                        {userName}, what would you tell a friend who was
                        experiencing similar thoughts about{' '}
                        {selectedTheme.name.toLowerCase()}?
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Floating Action Buttons */}
      {entryId && (
        <TouchableOpacity
          style={styles.viewEntryButton}
          onPress={() =>
            navigation.navigate('EntryDetail', {
              entryId: entryId,
            })
          }>
          <JournalIcon size={20} />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.newEntryButton}
        onPress={() => navigation.navigate('Home')}>
        <HomeIcon size={24} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    backgroundColor: '#F8F8F8',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#000000',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  menuButton: {
    padding: 8,
  },
  menuDots: {
    fontSize: 20,
    color: '#666666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  loadingSubtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  progressBarBackground: {
    width: 200,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 4,
    backgroundColor: '#000000',
    borderRadius: 2,
  },
  content: {
    paddingBottom: 100,
  },
  dateSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  currentDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  summary: {
    fontSize: 14,
    color: '#666666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  categoryCount: {
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  themesGrid: {
    gap: 12,
  },
  themeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  themeIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  themeEmoji: {
    fontSize: 18,
  },
  themeContent: {
    flex: 1,
  },
  themeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  themeDescription: {
    fontSize: 14,
    color: '#666666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  themeAmount: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  emotionsContainer: {
    gap: 16,
  },
  emotionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emotionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emotionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  emotionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  emotionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  emotionBarContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  emotionBarBackground: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  emotionBarFill: {
    height: 6,
    borderRadius: 3,
  },
  emotionPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    minWidth: 40,
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F8F8',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#000000',
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  insightEmoji: {
    fontSize: 16,
  },
  insightText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#000000',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  perspectiveCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F8F8',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#666666',
  },
  perspectiveIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#666666',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  perspectiveEmoji: {
    fontSize: 16,
  },
  perspectiveText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#000000',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 15,
    color: '#666666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  newEntryButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#000000',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  newEntryButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '300',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    backgroundColor: '#F8F8F8',
  },
  modalBackButton: {
    padding: 8,
  },
  modalBackText: {
    fontSize: 24,
    color: '#000000',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  modalSpacer: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    paddingBottom: 40,
  },
  modalThemeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  modalThemeIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  modalThemeEmoji: {
    fontSize: 28,
  },
  modalThemeInfo: {
    flex: 1,
  },
  modalThemeName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  modalThemeCount: {
    fontSize: 14,
    color: '#666666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  modalSection: {
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  modalBreakdown: {
    fontSize: 15,
    lineHeight: 22,
    color: '#666666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  modalInsightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalInsightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000000',
    marginTop: 8,
    marginRight: 12,
  },
  modalInsightText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#000000',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  reflectionCard: {
    backgroundColor: '#F8F8F8',
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
  viewEntryButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    backgroundColor: '#000000',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  viewEntryButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '300',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
});

export default AnalysisScreen;
