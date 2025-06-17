import {journalEntriesService} from './journalEntries';
import {safeAwait} from '../utils/safeAwait';

export interface EmotionSummary {
  name: string;
  totalPercentage: number;
  averagePercentage: number;
  occurrences: number;
  color: string;
}

export interface EmotionAnalytics {
  mostCommonEmotion: EmotionSummary | null;
  totalEntries: number;
  emotionBreakdown: EmotionSummary[];
}

/**
 * Analyzes all journal entries to find emotion patterns
 */
export const analyzeUserEmotions = async (): Promise<EmotionAnalytics> => {
  const [error, entries] = await safeAwait(journalEntriesService.getEntries());

  if (error || !entries || entries.length === 0) {
    console.error('Error loading entries for emotion analysis:', error);
    return {
      mostCommonEmotion: null,
      totalEntries: 0,
      emotionBreakdown: [],
    };
  }

  // Filter entries that have analysis data with emotions
  const entriesWithEmotions = entries.filter(
    entry =>
      entry.analysisData?.emotions &&
      Array.isArray(entry.analysisData.emotions),
  );

  if (entriesWithEmotions.length === 0) {
    return {
      mostCommonEmotion: null,
      totalEntries: entries.length,
      emotionBreakdown: [],
    };
  }

  // Aggregate emotions across all entries
  const emotionMap = new Map<
    string,
    {
      totalPercentage: number;
      occurrences: number;
      color: string;
    }
  >();

  entriesWithEmotions.forEach(entry => {
    entry.analysisData.emotions.forEach((emotion: any) => {
      const emotionName = emotion.name.toLowerCase();
      const existing = emotionMap.get(emotionName);

      if (existing) {
        existing.totalPercentage += emotion.percentage;
        existing.occurrences += 1;
      } else {
        emotionMap.set(emotionName, {
          totalPercentage: emotion.percentage,
          occurrences: 1,
          color: emotion.color,
        });
      }
    });
  });

  // Convert to array and calculate averages
  const emotionBreakdown: EmotionSummary[] = Array.from(emotionMap.entries())
    .map(([name, data]) => ({
      name: capitalizeFirstLetter(name),
      totalPercentage: data.totalPercentage,
      averagePercentage: Math.round(data.totalPercentage / data.occurrences),
      occurrences: data.occurrences,
      color: data.color,
    }))
    .sort((a, b) => b.totalPercentage - a.totalPercentage);

  // Find most common emotion (highest total percentage across all entries)
  const mostCommonEmotion =
    emotionBreakdown.length > 0 ? emotionBreakdown[0] : null;

  return {
    mostCommonEmotion,
    totalEntries: entries.length,
    emotionBreakdown,
  };
};

/**
 * Gets the most common emotion for quick display
 */
export const getMostCommonEmotion =
  async (): Promise<EmotionSummary | null> => {
    const analytics = await analyzeUserEmotions();
    return analytics.mostCommonEmotion;
  };

/**
 * Helper function to capitalize first letter
 */
const capitalizeFirstLetter = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Gets an appropriate emoji for an emotion
 */
export const getEmotionEmoji = (emotionName: string): string => {
  const emotion = emotionName.toLowerCase();

  const emojiMap: Record<string, string> = {
    happy: '😊',
    joy: '😄',
    joyful: '😄',
    excited: '🤩',
    grateful: '🙏',
    thankful: '🙏',
    hopeful: '🌟',
    optimistic: '🌈',
    peaceful: '😌',
    calm: '😌',
    relaxed: '😌',
    content: '😊',
    satisfied: '😊',
    proud: '😌',
    confident: '💪',
    motivated: '🔥',
    inspired: '✨',
    creative: '🎨',
    focused: '🎯',
    determined: '💪',

    sad: '😢',
    disappointed: '😞',
    frustrated: '😤',
    angry: '😠',
    annoyed: '😒',
    stressed: '😰',
    anxious: '😰',
    worried: '😟',
    nervous: '😬',
    overwhelmed: '😵',
    tired: '😴',
    exhausted: '😴',
    lonely: '😔',
    confused: '😕',
    uncertain: '🤔',
    doubtful: '🤔',

    contemplative: '🤔',
    reflective: '💭',
    thoughtful: '💭',
    curious: '🤔',
    wondering: '💭',
    introspective: '🧘',
    mindful: '🧘',
    aware: '👁️',

    love: '❤️',
    loved: '❤️',
    caring: '💕',
    compassionate: '💝',
    empathetic: '🤗',
    connected: '🤝',
    supported: '🤗',

    surprised: '😲',
    amazed: '😲',
    shocked: '😱',
    impressed: '👏',

    default: '💭',
  };

  return emojiMap[emotion] || emojiMap.default;
};
