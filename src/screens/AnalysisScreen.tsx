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
import Svg, {Circle, G, Text as SvgText, Path} from 'react-native-svg';
import {pack, hierarchy} from 'd3-hierarchy';
import {
  analyseJournalEntry,
  analyzeJournalEntryData,
  generateAlternativePerspective,
  type AnalysisData,
} from '../services/ai';
import {safeAwait} from '../utils/safeAwait';
import {getAnalysisData, saveAnalysisData} from '../services/journalEntries';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Analysis'>;

const BUBBLE_SIZE = 300;

type Theme = {name: string; count: number};

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
  const {entryText, entryId, skipAI = false, entryTitle} = route.params;

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

  // Theme detail modal state
  const [selectedTheme, setSelectedTheme] = useState<{
    name: string;
    count: number;
    breakdown: string;
    insights: string[];
  } | null>(null);
  const [showThemeModal, setShowThemeModal] = useState(false);

  // simple "progress" animation for your existing loader
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start();
  }, [progress]);

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
                    'You\'re actively processing your experiences',
                    'You show courage in facing difficult emotions'
                  ]
                },
                {
                  name: 'Daily Life', 
                  count: 3,
                  breakdown: 'You\'re navigating the complexities of everyday experiences and finding meaning in routine moments.',
                  insights: [
                    'You notice details in your daily experiences',
                    'You seek meaning in ordinary moments',
                    'You\'re building awareness of life patterns'
                  ]
                },
                {
                  name: 'Emotions', 
                  count: 3,
                  breakdown: 'Your emotional landscape is rich and varied, showing both vulnerability and strength.',
                  insights: [
                    'You acknowledge your feelings honestly',
                    'You\'re developing emotional intelligence',
                    'You show resilience in processing emotions'
                  ]
                },
                {
                  name: 'Relationships', 
                  count: 2,
                  breakdown: 'Your connections with others play an important role in your personal growth and well-being.',
                  insights: [
                    'You value meaningful connections',
                    'You\'re learning about interpersonal dynamics',
                    'You seek understanding in your relationships'
                  ]
                },
              ],
              emotions: [
                {name: 'Contemplative', percentage: 40},
                {name: 'Hopeful', percentage: 30},
                {name: 'Uncertain', percentage: 20},
                {name: 'Grateful', percentage: 10},
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
                'You\'re actively processing your experiences',
                'You show courage in facing difficult emotions'
              ]
            },
            {
              name: 'Daily Life', 
              count: 3,
              breakdown: 'You\'re navigating the complexities of everyday experiences and finding meaning in routine moments.',
              insights: [
                'You notice details in your daily experiences',
                'You seek meaning in ordinary moments',
                'You\'re building awareness of life patterns'
              ]
            },
            {
              name: 'Emotions', 
              count: 3,
              breakdown: 'Your emotional landscape is rich and varied, showing both vulnerability and strength.',
              insights: [
                'You acknowledge your feelings honestly',
                'You\'re developing emotional intelligence',
                'You show resilience in processing emotions'
              ]
            },
            {
              name: 'Relationships', 
              count: 2,
              breakdown: 'Your connections with others play an important role in your personal growth and well-being.',
              insights: [
                'You value meaningful connections',
                'You\'re learning about interpersonal dynamics',
                'You seek understanding in your relationships'
              ]
            },
          ],
          emotions: [
            {name: 'Contemplative', percentage: 40},
            {name: 'Hopeful', percentage: 30},
            {name: 'Uncertain', percentage: 20},
            {name: 'Grateful', percentage: 10},
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

  // bubble‐pack layout
  const themes = analysisData?.themes || [];
  const root = hierarchy<{children: Theme[]}>({children: themes})
    .sum((d: any) => d.count)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const packLayout = pack<{children: Theme[]}>()
    .size([BUBBLE_SIZE, BUBBLE_SIZE])
    .padding(12);
  const nodes = packLayout(root).descendants().slice(1);

  // Helper function to truncate long theme names
  const truncateThemeName = (name: string, maxLength: number = 12) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 1) + '…';
  };

  // Helper function to handle theme bubble press
  const handleThemePress = (theme: {name: string; count: number; breakdown: string; insights: string[]}) => {
    setSelectedTheme(theme);
    setShowThemeModal(true);
  };

  // Helper function to close theme modal
  const closeThemeModal = () => {
    setShowThemeModal(false);
    setSelectedTheme(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {entryTitle ? `Analysis: ${entryTitle}` : 'Analysis'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
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
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Themes</Text>
              <Text style={styles.sectionSubtitle}>Tap a bubble to explore</Text>
              <View style={styles.bubbleChartContainer}>
                <Svg width={BUBBLE_SIZE} height={BUBBLE_SIZE}>
                  <G>
                    {nodes.map((node, i) => (
                      <React.Fragment key={i}>
                        <Circle
                          cx={node.x}
                          cy={node.y}
                          r={node.r}
                          fill="#000000"
                          opacity={0.8}
                          onPress={() => handleThemePress(node.data as any)}
                        />
                        <SvgText
                          x={node.x}
                          y={node.y}
                          fontSize={Math.max(10, Math.min(14, node.r / 2.5))}
                          fill="#FFFFFF"
                          fontWeight="bold"
                          textAnchor="middle"
                          alignmentBaseline="middle"
                          onPress={() => handleThemePress(node.data as any)}>
                          {truncateThemeName((node.data as any).name)}
                        </SvgText>
                      </React.Fragment>
                    ))}
                  </G>
                </Svg>
              </View>
            </View>

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Emotion Breakdown</Text>
              {(analysisData?.emotions || []).map((e, i) => (
                <View key={i} style={styles.emotionRow}>
                  <Text style={styles.emotionName}>{e.name}</Text>
                  <View style={styles.emotionBarBackground}>
                    <View
                      style={[
                        styles.emotionBarFill,
                        {width: `${e.percentage}%`},
                      ]}
                    />
                  </View>
                  <Text style={styles.emotionPercent}>{e.percentage}%</Text>
                </View>
              ))}
            </View>

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Alternative Perspective</Text>
              {loadingPerspective ? (
                <View style={styles.perspectiveLoadingContainer}>
                  <ActivityIndicator size="small" color="#000000" />
                  <Text style={styles.perspectiveLoadingText}>
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

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>AI Insights</Text>
              {loadingAI ? (
                <View style={styles.aiLoadingContainer}>
                  <ActivityIndicator size="small" color="#000000" />
                  <Text style={styles.aiLoadingText}>
                    Generating insights...
                  </Text>
                </View>
              ) : (
                <View style={styles.aiCard}>
                  <Text style={styles.aiText}>{aiText}</Text>
                </View>
              )}
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
            <Text style={styles.modalTitle}>
              {selectedTheme?.name}
            </Text>
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
                  <Text style={styles.modalSectionTitle}>Overview</Text>
                  <Text style={styles.modalBreakdown}>
                    {selectedTheme.breakdown}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Key Insights</Text>
                  {selectedTheme.insights.map((insight, index) => (
                    <View key={index} style={styles.insightItem}>
                      <View style={styles.insightBullet} />
                      <Text style={styles.insightText}>{insight}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Reflection Questions</Text>
                  <View style={styles.reflectionCard}>
                    <Text style={styles.reflectionText}>
                      How does this theme show up in other areas of your life?
                    </Text>
                  </View>
                  <View style={styles.reflectionCard}>
                    <Text style={styles.reflectionText}>
                      What patterns do you notice around {selectedTheme.name.toLowerCase()}?
                    </Text>
                  </View>
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
    flex: 1,
    marginRight: 10,
  },
  content: {
    padding: 20,
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
  progressBarBackground: {
    width: 180,
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
  sectionContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  bubbleChartContainer: {
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 10,
  },
  emotionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  emotionName: {
    width: 80,
    fontSize: 15,
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  emotionBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  emotionBarFill: {
    height: 6,
    backgroundColor: '#000000',
    borderRadius: 3,
  },
  emotionPercent: {
    width: 40,
    fontSize: 15,
    color: '#888888',
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  perspectiveCard: {
    backgroundColor: '#F5F5F7',
    padding: 16,
    borderRadius: 16,
  },
  perspectiveText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  perspectiveLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F5F5F7',
    borderRadius: 16,
  },
  perspectiveLoadingText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#888888',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  aiLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F5F5F7',
    borderRadius: 16,
  },
  aiLoadingText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#888888',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  aiCard: {
    backgroundColor: '#F5F5F7',
    padding: 16,
    borderRadius: 16,
  },
  aiText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  viewEntryButton: {
    padding: 8,
    backgroundColor: '#000000',
    borderRadius: 8,
  },
  viewEntryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
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
  insightText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#333333',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
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
});
