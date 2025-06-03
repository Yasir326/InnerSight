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
} from 'react-native';
import Svg, {Circle, G, Text as SvgText} from 'react-native-svg';
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
                {name: 'Self-Reflection', count: 4},
                {name: 'Daily Life', count: 3},
                {name: 'Emotions', count: 3},
                {name: 'Relationships', count: 2},
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
            {name: 'Self-Reflection', count: 4},
            {name: 'Daily Life', count: 3},
            {name: 'Emotions', count: 3},
            {name: 'Relationships', count: 2},
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {entryTitle ? `Analysis: ${entryTitle}` : 'Analysis'}
        </Text>
        {entryId && (
          <TouchableOpacity
            style={styles.viewEntryButton}
            onPress={() => navigation.navigate('EntryDetail', {entryId})}>
            <Text style={styles.viewEntryButtonText}>View Entry</Text>
          </TouchableOpacity>
        )}
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
                        />
                        <SvgText
                          x={node.x}
                          y={node.y}
                          fontSize={Math.max(10, Math.min(14, node.r / 2.5))}
                          fill="#FFFFFF"
                          fontWeight="bold"
                          textAnchor="middle"
                          alignmentBaseline="middle">
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
});
