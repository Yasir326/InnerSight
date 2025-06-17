'use client';

import type React from 'react';

import {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/AppNavigator';
import {journalEntriesService} from '../services/journalEntries';
import {safeAwait} from '../utils/safeAwait';
import { Path, Circle, G } from 'react-native-svg';
import Svg from 'react-native-svg';

type Props = NativeStackScreenProps<RootStackParamList, 'EntryDetail'>;

const AnalysisIcon: React.FC<{size?: number; color?: string}> = ({
  size = 24,
  color = '#FFFFFF',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <G>
      <Circle
        cx="8"
        cy="10"
        r="3"
        fill="#f6f8f9"
        stroke={color}
        strokeWidth="2"
      />
      <Path
        d="M5.83,12.12,3,15M8,7a3,3,0,1,0,3,3A3,3,0,0,0,8,7Zm3,10h6m-2-4h2"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <Path
        d="M8,3H20a1,1,0,0,1,1,1V20a1,1,0,0,1-1,1H8a1,1,0,0,1-1-1V17"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </G>
  </Svg>
);

const EntryDetailScreen: React.FC<Props> = ({route, navigation}) => {
  const {entryId} = route.params;
  const [entry, setEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEntry = async () => {
      const [error, journalEntry] = await safeAwait(
        journalEntriesService.getEntry(entryId),
      );

      if (error) {
        console.error('Error loading journal entry:', error);
      } else if (journalEntry) {
        setEntry(journalEntry);
      } else {
        navigation.goBack();
      }

      setLoading(false);
    };

    loadEntry();
  }, [entryId, navigation]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
        </View>
      </SafeAreaView>
    );
  }

  if (!entry) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Entry not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Journal Entry</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}>
        <Text style={styles.date}>{formatDate(entry.createdAt)}</Text>
        <Text style={styles.title}>{entry.title}</Text>

        {entry.conversationData ? (
          // Render conversation if available
          entry.conversationData.map((item: any) => (
            <View key={item.id} style={styles.entryContainer}>
              {item.type === 'user' ? (
                <Text style={styles.userText}>{item.text}</Text>
              ) : (
                <View style={styles.aiContainer}>
                  <View style={styles.aiAccent} />
                  <Text style={styles.aiText}>{item.text}</Text>
                </View>
              )}
            </View>
          ))
        ) : (
          // Fallback to content if conversation data not available
          <Text style={styles.content}>{entry.content}</Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.analyzeButton}
          onPress={() =>
            navigation.navigate('Analysis', {
              entryText: entry.content,
              entryId: entry.id,
              skipAI: true,
              entryTitle: entry.title,
            })
          }>
          <AnalysisIcon size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 12,
  },
  backButtonText: {
    fontSize: 17,
    color: '#007AFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  placeholder: {
    width: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 17,
    color: '#888888',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  date: {
    fontSize: 15,
    color: '#888888',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
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
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  analyzeButton: {
    backgroundColor: '#000000',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});

export default EntryDetailScreen;
