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

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  conversationData?: any;
  analysisData?: any;
  alternativePerspective?: string;
  aiInsights?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JournalStats {
  totalTime: string;
  currentStreak: number;
  totalEntries: number;
  lastEntryDate: string;
}

export interface OnboardingData {
  userName: string;
  goals: string[];
  challenges: string[];
  reflections: {
    current_state: string;
    ideal_self: string;
    biggest_obstacle: string;
  };
  completedAt: string;
}

export interface JournalEntry {
  id: string;
  text: string;
  date: string;
  themes: {name: string; count: number}[];
  emotions: {name: string; percentage: number}[];
  perspective: string;
}

export interface JournalStats {
  totalTime: string;
  currentStreak: number;
  totalEntries: number;
  lastEntryDate: string;
}
