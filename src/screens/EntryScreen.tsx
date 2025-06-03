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
import {analyseJournalEntry} from '../services/ai';
import {safeAwait} from '../utils/safeAwait';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/AppNavigator';
import {
  saveJournalEntry,
  generateTitleFromContent,
} from '../services/journalEntries';

interface ConversationEntry {
  id: string;
  type: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export default function EntryScreen() {
  const [currentEntry, setCurrentEntry] = useState('');
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // track a debouncing timer
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom when new content is added
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({animated: true});
      }, 100);
    }
  }, [conversation, loading]);

  // Handle text input changes
  const handleTextChange = (text: string) => {
    setCurrentEntry(text);

    // Clear any pending call
    clearTimeout(debounceRef.current!);

    if (!text.trim()) return;

    debounceRef.current = setTimeout(() => {
      handleSubmit();
    }, 5500);
  };

  // Submit the current entry
  const handleSubmit = async () => {
    if (!currentEntry.trim()) return;

    // Add user entry to conversation
    const userEntry: ConversationEntry = {
      id: Date.now().toString(),
      type: 'user',
      text: currentEntry,
      timestamp: new Date(),
    };

    setConversation(prev => [...prev, userEntry]);
    setCurrentEntry('');
    setLoading(true);

    try {
      // Get AI response
      const [err, result] = await safeAwait(analyseJournalEntry(currentEntry));

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
      generateTitleFromContent(
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
        saveJournalEntry({
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
          entryId: savedEntry.id,
        });
      }
    } else {
      // Save the journal entry
      const [error, savedEntry] = await safeAwait(
        saveJournalEntry({
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
          entryId: savedEntry.id,
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

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.finishButton,
            conversation.length === 0 && styles.finishButtonDisabled,
          ]}
          onPress={handleFinishEntry}
          disabled={conversation.length === 0 || saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text
              style={[
                styles.finishButtonText,
                conversation.length === 0 && styles.finishButtonTextDisabled,
              ]}>
              Finish Entry
            </Text>
          )}
        </TouchableOpacity>
      </View>
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
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
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
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
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
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
    minHeight: 100,
  },
  spacer: {
    height: 100,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  finishButton: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  finishButtonDisabled: {
    backgroundColor: '#F0F0F0',
  },
  finishButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  finishButtonTextDisabled: {
    color: '#BBBBBB',
  },
});
