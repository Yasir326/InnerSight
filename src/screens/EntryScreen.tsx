'use client';

import {useRef, useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {analyseJournalEntry, generateTitleFromEntry} from '../services/ai';
import {safeAwait} from '../utils/safeAwait';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {baseFontFamily} from '../utils/platform';
import type {RootStackParamList} from '../navigation/AppNavigator';
import {
  journalEntriesService,
} from '../services/journalEntries';
import Svg, {Path} from 'react-native-svg';

interface ConversationEntry {
  id: string;
  type: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

const HomeIcon: React.FC<{size?: number; color?: string}> = ({
  size = 24,
  color = '#FFFFFF',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </Svg>
);

const FinishIcon: React.FC<{size?: number; color?: string}> = ({
  size = 24,
  color = '#FFFFFF',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
  </Svg>
);

export default function EntryScreen() {
  const [currentEntry, setCurrentEntry] = useState('');
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({animated: true});
      }, 100);
    }
  }, [conversation, loading]);

  const handleTextChange = (text: string) => {
    setCurrentEntry(text);

    clearTimeout(debounceRef.current!);

    if (!text.trim()) return;

    debounceRef.current = setTimeout(() => {
      handleSubmit();
    }, 5500);
  };

  const handleSubmit = async () => {
    if (!currentEntry.trim()) return;

    const userEntry: ConversationEntry = {
      id: Date.now().toString(),
      type: 'user',
      text: currentEntry,
      timestamp: new Date(),
    };

    const updatedConversation = [...conversation, userEntry];
    setConversation(updatedConversation);

    // Build full context for AI (all user entries so far)
    const fullContext = updatedConversation
      .filter(entry => entry.type === 'user')
      .map(entry => entry.text)
      .join('\n\n');

    setCurrentEntry('');
    setLoading(true);

    try {
      // Get AI response with full context
      const [err, result] = await safeAwait(analyseJournalEntry(fullContext));

      if (err) {
        console.error(err);
        Alert.alert('Error', err.message);
      } else {
        // Add AI response to conversation
        const aiEntry: ConversationEntry = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          text: result as string,
          timestamp: new Date(),
        };

        setConversation(prev => [...prev, aiEntry]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Finish entry and navigate to analysis screen
  const handleFinishEntry = async () => {
    if (conversation.length === 0) return;

    setSaving(true);

    // Combine all user entries for content
    const fullText = conversation
      .filter(entry => entry.type === 'user')
      .map(entry => entry.text)
      .join('\n\n');

    // Generate a title from the first entry
    const [titleError, title] = await safeAwait(
      generateTitleFromEntry(
        conversation[0].type === 'user' ? conversation[0].text : fullText,
      ),
    );

    if (titleError) {
      console.error('Error generating title:', titleError);
      // Use fallback title if generation fails
      const fallbackTitle =
        conversation[0].type === 'user'
          ? conversation[0].text.split('\n')[0].trim().substring(0, 40) + '...'
          : 'Journal Entry';

      // Save the journal entry
      const [error, savedEntry] = await safeAwait(
        journalEntriesService.saveEntry({
          title: fallbackTitle,
          content: fullText,
          conversationData: conversation,
        }),
      );

      if (error) {
        console.error('Error saving journal entry:', error);
        Alert.alert(
          'Error',
          'Failed to save your journal entry. Please try again.',
        );
      } else {
        // Navigate to analysis screen with entry ID
        navigation.navigate('Analysis', {
          entryText: fullText,
          entryId: savedEntry?.id || '',
        });
      }
    } else {
      // Save the journal entry
      const [error, savedEntry] = await safeAwait(
        journalEntriesService.saveEntry({
          title: title || 'Journal Entry',
          content: fullText,
          conversationData: conversation,
        }),
      );

      if (error) {
        console.error('Error saving journal entry:', error);
        Alert.alert(
          'Error',
          'Failed to save your journal entry. Please try again.',
        );
      } else {
        // Navigate to analysis screen with entry ID
        navigation.navigate('Analysis', {
          entryText: fullText,
          entryId: savedEntry?.id || '',
        });
      }
    }

    setSaving(false);
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.date}>{currentDate}</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Render conversation history */}
          {conversation.map(entry => (
            <View key={entry.id} style={styles.entryContainer}>
              {entry.type === 'user' ? (
                <Text style={styles.userText}>{entry.text}</Text>
              ) : (
                <View style={styles.aiContainer}>
                  <View style={styles.aiAccent} />
                  <Text style={styles.aiText}>{entry.text}</Text>
                </View>
              )}
            </View>
          ))}

          {/* Show loading indicator */}
          {loading && (
            <View style={styles.loadingContainer}>
              <View style={styles.aiAccent} />
              <ActivityIndicator
                size="small"
                color="#007AFF"
                style={styles.loadingIndicator}
              />
            </View>
          )}

          {/* Current text input */}
          <TextInput
            ref={textInputRef}
            style={styles.input}
            multiline
            placeholder={
              conversation.length === 0
                ? 'Write your thoughts here...'
                : 'Continue writing...'
            }
            placeholderTextColor="#BBBBBB"
            value={currentEntry}
            onChangeText={handleTextChange}
            textAlignVertical="top"
          />

          <View style={styles.spacer} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating Finish Entry Button */}
      {conversation.length > 0 && (
        <TouchableOpacity
          style={[
            styles.finishButton,
            saving && styles.finishButtonDisabled,
          ]}
          onPress={handleFinishEntry}
          disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <FinishIcon size={24} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      )}

      {/* Floating Home Button */}
      <TouchableOpacity
        style={styles.homeButton}
        onPress={() => navigation.navigate('Home')}>
        <HomeIcon size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  date: {
    fontSize: 15,
    fontWeight: '500',
    color: '#888888',
  },
  inner: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
  },
  entryContainer: {
    marginBottom: 24,
  },
  userText: {
    fontSize: 17,
    lineHeight: 26,
    color: '#000000',
    fontFamily: baseFontFamily,
  },
  aiContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  aiAccent: {
    width: 3,
    backgroundColor: '#007AFF',
    borderRadius: 1.5,
    marginRight: 12,
    alignSelf: 'stretch',
  },
  aiText: {
    fontSize: 17,
    lineHeight: 26,
    color: '#007AFF',
    fontFamily: baseFontFamily,
    flex: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    alignItems: 'center',
  },
  loadingIndicator: {
    marginLeft: 12,
  },
  input: {
    fontSize: 17,
    lineHeight: 26,
    color: '#000000',
    padding: 0,
    textAlignVertical: 'top',
    fontFamily: baseFontFamily,
    minHeight: 100,
  },
  spacer: {
    height: 100,
  },
  finishButton: {
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
  finishButtonDisabled: {
    backgroundColor: '#CCCCCC',
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
});
