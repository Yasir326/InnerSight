'use client';

import type React from 'react';

import {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/AppNavigator';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {getJournalEntries, deleteJournalEntry, type JournalEntry} from '../services/journalEntries';
import {safeAwait} from '../utils/safeAwait';
import {getUserName} from '../services/onboarding';

// Custom Trash Icon Component
const TrashIcon: React.FC<{size?: number; color?: string}> = ({
  size = 16,
  color = '#FFFFFF',
}) => (
  <Svg width={size} height={size} viewBox="0 0 448 512" fill={color}>
    <Path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/>
  </Svg>
);

const HomeScreen: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, 'Home'>>();

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        setLoading(true);
        const [entriesError, journalEntries] = await safeAwait(
          getJournalEntries(),
        );
        const [nameError, name] = await safeAwait(getUserName());

        if (entriesError) {
          console.error('Error loading journal entries:', entriesError);
        } else {
          setEntries(journalEntries);
        }

        if (nameError) {
          console.error('Error loading user name:', nameError);
        } else {
          setUserName(name);
        }

        setLoading(false);
      };

      loadData();
    }, []),
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    let greeting = 'Hello';

    if (hour < 12) {
      greeting = 'Good morning';
    } else if (hour < 17) {
      greeting = 'Good afternoon';
    } else {
      greeting = 'Good evening';
    }

    if (userName && userName.trim()) {
      return `${greeting}, ${userName}! what's on your mind?`;
    }

    return `${greeting}!`;
  };

  const handleDeleteEntry = (entryId: string, entryTitle: string) => {
    Alert.alert(
      'Delete Entry',
      `Are you sure you want to delete "${entryTitle}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const [error, success] = await safeAwait(deleteJournalEntry(entryId));
            
            if (error || !success) {
              console.error('Error deleting journal entry:', error);
              Alert.alert(
                'Error',
                'Failed to delete the journal entry. Please try again.',
              );
            } else {
              // Remove the entry from the local state
              setEntries(prevEntries => prevEntries.filter(entry => entry.id !== entryId));
            }
          },
        },
      ],
    );
  };

  const renderEntryItem = ({item}: {item: JournalEntry}) => (
    <View style={styles.entryCard}>
      <TouchableOpacity
        style={styles.entryContent}
        onPress={() =>
          navigation.navigate('Analysis', {
            entryText: item.content,
            entryId: item.id,
            skipAI: true,
            entryTitle: item.title,
          })
        }>
        <View style={styles.entryHeader}>
          <Text style={styles.entryDate}>{formatDate(item.createdAt)}</Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteEntry(item.id, item.title)}>
            <TrashIcon size={16} color="#333333" />
          </TouchableOpacity>
        </View>
        <Text style={styles.entryTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.entryPreview} numberOfLines={2}>
          {item.content}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No Journal Entries Yet</Text>
      <Text style={styles.emptyText}>
        Start writing to begin your journaling journey.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeMessage}>{getWelcomeMessage()}</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
        </View>
      ) : (
        <FlatList
          data={entries}
          renderItem={renderEntryItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyList}
          ListHeaderComponent={
            entries.length > 0 ? (
              <Text style={styles.sectionTitle}>Your Journal Entries</Text>
            ) : null
          }
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.newEntryButton}
          onPress={() => navigation.navigate('Entry')}>
          <Text style={styles.newEntryButtonText}>New Entry</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  welcomeMessage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#666666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 20,
    flexGrow: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  entryCard: {
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  entryContent: {
    flex: 1,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryDate: {
    fontSize: 14,
    color: '#888888',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  entryTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  entryPreview: {
    fontSize: 15,
    color: '#555555',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  deleteButton: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  emptyText: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  newEntryButton: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  newEntryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
});

export default HomeScreen;
