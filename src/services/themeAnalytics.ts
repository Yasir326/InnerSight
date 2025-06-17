import {journalEntriesService} from './journalEntries';
import {safeAwait} from '../utils/safeAwait';

export interface ThemeSummary {
  name: string;
  totalCount: number;
  averageCount: number;
  occurrences: number;
  emoji: string;
}

export interface ThemeAnalytics {
  mostCommonTheme: ThemeSummary | null;
  totalEntries: number;
  themeBreakdown: ThemeSummary[];
}

/**
 * Analyzes all journal entries to find theme patterns
 */
export const analyzeUserThemes = async (): Promise<ThemeAnalytics> => {
  const [error, entries] = await safeAwait(journalEntriesService.getEntries());

  if (error || !entries || entries.length === 0) {
    console.error('Error loading entries for theme analysis:', error);
    return {
      mostCommonTheme: null,
      totalEntries: 0,
      themeBreakdown: [],
    };
  }

  // Filter entries that have analysis data with themes
  const entriesWithThemes = entries.filter(
    entry =>
      entry.analysisData?.themes &&
      Array.isArray(entry.analysisData.themes),
  );

  if (entriesWithThemes.length === 0) {
    return {
      mostCommonTheme: null,
      totalEntries: entries.length,
      themeBreakdown: [],
    };
  }

  // Aggregate themes across all entries
  const themeMap = new Map<
    string,
    {
      totalCount: number;
      occurrences: number;
      emoji: string;
    }
  >();

  entriesWithThemes.forEach(entry => {
    entry.analysisData.themes.forEach((theme: any) => {
      const themeName = theme.name.toLowerCase();
      const existing = themeMap.get(themeName);

      if (existing) {
        existing.totalCount += theme.count;
        existing.occurrences += 1;
      } else {
        themeMap.set(themeName, {
          totalCount: theme.count,
          occurrences: 1,
          emoji: theme.emoji,
        });
      }
    });
  });

  // Convert to array and calculate averages
  const themeBreakdown: ThemeSummary[] = Array.from(themeMap.entries())
    .map(([name, data]) => ({
      name: capitalizeFirstLetter(name),
      totalCount: data.totalCount,
      averageCount: Math.round(data.totalCount / data.occurrences),
      occurrences: data.occurrences,
      emoji: data.emoji,
    }))
    .sort((a, b) => b.totalCount - a.totalCount);

  // Find most common theme (highest total count across all entries)
  const mostCommonTheme =
    themeBreakdown.length > 0 ? themeBreakdown[0] : null;

  return {
    mostCommonTheme,
    totalEntries: entries.length,
    themeBreakdown,
  };
};

/**
 * Gets the most common theme for quick display
 */
export const getMostCommonTheme =
  async (): Promise<ThemeSummary | null> => {
    const analytics = await analyzeUserThemes();
    return analytics.mostCommonTheme;
  };

/**
 * Helper function to capitalize first letter
 */
const capitalizeFirstLetter = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Gets an appropriate emoji for a theme
 */
export const getThemeEmoji = (themeName: string): string => {
  const theme = themeName.toLowerCase();

  const emojiMap: Record<string, string> = {
    'self-reflection': '🤔',
    'self-discovery': '🔍',
    introspection: '💭',
    mindfulness: '🧘',
    awareness: '👁️',
    growth: '🌱',
    'personal growth': '🌱',
    'self-improvement': '📈',
    development: '🚀',

    work: '💼',
    career: '🎯',
    job: '💼',
    professional: '👔',
    business: '📊',
    productivity: '⚡',
    goals: '🎯',
    achievement: '🏆',
    success: '✨',

    family: '👨‍👩‍👧‍👦',
    relationships: '❤️',
    love: '💕',
    friendship: '🤝',
    connection: '🔗',
    social: '👥',
    community: '🏘️',
    support: '🤗',

    health: '🏥',
    fitness: '💪',
    exercise: '🏃',
    wellness: '🌿',
    'mental health': '🧠',
    healing: '🌈',
    recovery: '🔄',
    balance: '⚖️',

    emotions: '💭',
    feelings: '💝',
    mood: '🌈',
    anxiety: '😰',
    stress: '😤',
    sadness: '😔',
    happiness: '😊',
    joy: '😄',
    peace: '☮️',
    calm: '😌',

    creativity: '🎨',
    art: '🖼️',
    music: '🎵',
    writing: '✍️',
    inspiration: '💡',
    imagination: '🌟',
    innovation: '🚀',

    'daily life': '📅',
    routine: '🔁',
    habits: '📋',
    lifestyle: '🏠',
    home: '🏡',
    comfort: '🛋️',

    travel: '✈️',
    adventure: '🗺️',
    exploration: '🧭',
    journey: '🛤️',
    discovery: '🔍',

    learning: '📚',
    education: '🎓',
    knowledge: '🧠',
    study: '📖',
    understanding: '💡',
    wisdom: '🦉',

    challenges: '⛰️',
    obstacles: '🚧',
    problems: '🧩',
    solutions: '💡',
    overcoming: '🏔️',

    future: '🔮',
    dreams: '💭',
    hopes: '🌟',
    plans: '📋',
    vision: '👁️',
    aspirations: '🎯',

    gratitude: '🙏',
    appreciation: '💝',
    thankfulness: '🌸',
    blessings: '✨',

    nature: '🌳',
    outdoors: '🌲',
    environment: '🌍',
    seasons: '🍂',
    weather: '🌤️',

    spirituality: '🕯️',
    faith: '⭐',
    meditation: '🧘',
    prayer: '🙏',
    meaning: '💫',
    purpose: '🎯',

    change: '🔄',
    transition: '🌉',
    transformation: '🦋',
    adaptation: '🌱',
    evolution: '📈',

    default: '💭',
  };

  return emojiMap[theme] || emojiMap.default;
}; 