import AsyncStorage from '@react-native-async-storage/async-storage';
import {safeAwait} from '../utils/safeAwait';
import {generateTitleFromEntry, type AnalysisData} from './ai';

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  conversationData: any; // Store the full conversation
  createdAt: string;
  updatedAt: string;
  // AI Analysis data - stored when entry is first analyzed
  analysisData?: AnalysisData;
  alternativePerspective?: string;
  aiInsights?: string;
}

const JOURNAL_ENTRIES_KEY = '@journal_entries';

// Get all journal entries
export const getJournalEntries = async (): Promise<JournalEntry[]> => {
  const [error, entries] = await safeAwait(
    AsyncStorage.getItem(JOURNAL_ENTRIES_KEY),
  );
  if (error) {
    console.error('Error getting journal entries:', error);
  }

  if (!entries) {
    return [];
  }

  return JSON.parse(entries).sort(
    (a: JournalEntry, b: JournalEntry) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
};

// Get a single journal entry by ID
export const getJournalEntryById = async (
  id: string,
): Promise<JournalEntry | null> => {
  const [error, entries] = await safeAwait(getJournalEntries());

  if (error) {
    console.error('Error getting journal entry:', error);
    return null;
  }

  return entries.find(entry => entry.id === id) || null;
};

// Save a new journal entry
export const saveJournalEntry = async (
  entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<JournalEntry> => {
  const [getError, entries] = await safeAwait(getJournalEntries());

  if (getError) {
    console.error('Error getting journal entries for save:', getError);
    throw getError;
  }

  const newEntry: JournalEntry = {
    ...entry,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updatedEntries = [newEntry, ...entries];
  const [saveError] = await safeAwait(
    AsyncStorage.setItem(JOURNAL_ENTRIES_KEY, JSON.stringify(updatedEntries)),
  );

  if (saveError) {
    console.error('Error saving journal entry:', saveError);
    throw saveError;
  }

  return newEntry;
};

// Update an existing journal entry
export const updateJournalEntry = async (
  id: string,
  updates: Partial<JournalEntry>,
): Promise<JournalEntry | null> => {
  const [error, entries] = await safeAwait(getJournalEntries());

  if (error) {
    console.error('Error updating journal entry:', error);
    return null;
  }

  const entryIndex = entries.findIndex(entry => entry.id === id);

  if (entryIndex === -1) return null;

  const updatedEntry = {
    ...entries[entryIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  entries[entryIndex] = updatedEntry;

  const [saveError] = await safeAwait(
    AsyncStorage.setItem(JOURNAL_ENTRIES_KEY, JSON.stringify(entries)),
  );

  if (saveError) {
    console.error('Error updating journal entry:', saveError);
    return null;
  }

  return updatedEntry;
};

// Delete a journal entry
export const deleteJournalEntry = async (id: string): Promise<boolean> => {
  const [getError, entries] = await safeAwait(getJournalEntries());

  if (getError) {
    console.error('Error getting entries for deletion:', getError);
    return false;
  }

  const filteredEntries = entries.filter(entry => entry.id !== id);

  if (filteredEntries.length === entries.length) return false;

  const [saveError] = await safeAwait(
    AsyncStorage.setItem(JOURNAL_ENTRIES_KEY, JSON.stringify(filteredEntries)),
  );

  if (saveError) {
    console.error('Error deleting journal entry:', saveError);
    return false;
  }

  return true;
};

// Generate a title from content
export const generateTitleFromContent = async (
  content: string,
): Promise<string> => {
  const [error, aiTitle] = await safeAwait(generateTitleFromEntry(content));

  if (!error && aiTitle) {
    return aiTitle;
  }

  console.log('AI title generation failed, using fallback:', error);

  const firstLine = content.split('\n')[0].trim();

  if (firstLine.length <= 40) {
    return firstLine;
  }

  return firstLine.substring(0, 40) + '...';
};

// Save analysis data to an existing journal entry
export const saveAnalysisData = async (
  entryId: string,
  analysisData: AnalysisData,
  alternativePerspective: string,
  aiInsights: string,
): Promise<boolean> => {
  const [error, success] = await safeAwait(
    updateJournalEntry(entryId, {
      analysisData,
      alternativePerspective,
      aiInsights,
    }),
  );

  if (error) {
    console.error('Error saving analysis data:', error);
    return false;
  }

  return success !== null;
};

// Get analysis data for a journal entry
export const getAnalysisData = async (
  entryId: string,
): Promise<{
  analysisData: AnalysisData | null;
  alternativePerspective: string | null;
  aiInsights: string | null;
}> => {
  const [error, entry] = await safeAwait(getJournalEntryById(entryId));

  if (error || !entry) {
    console.error('Error getting analysis data:', error);
    return {
      analysisData: null,
      alternativePerspective: null,
      aiInsights: null,
    };
  }

  return {
    analysisData: entry.analysisData || null,
    alternativePerspective: entry.alternativePerspective || null,
    aiInsights: entry.aiInsights || null,
  };
};
