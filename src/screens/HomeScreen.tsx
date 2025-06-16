import React, {useState, useCallback} from 'react';
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
import {journalEntriesService, JournalEntry} from '../services/journalEntries';
import {safeAwait} from '../utils/safeAwait';
import {getUserName} from '../services/onboarding';
import {storageService} from '../services/storage';
import {getMostCommonEmotion, getEmotionEmoji, type EmotionSummary} from '../services/emotionAnalytics';

// Custom Icons
const TrashIcon: React.FC<{size?: number; color?: string}> = ({
  size = 16,
  color = '#9CA3AF',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
  </Svg>
);

const PlusIcon: React.FC<{size?: number; color?: string}> = ({
  size = 24,
  color = '#FFFFFF',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
  </Svg>
);

const BookIcon: React.FC<{size?: number; color?: string}> = ({
  size = 48,
  color = '#D1D5DB',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M18,2A2,2 0 0,1 20,4V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2H18M18,4H13V12L10.5,9.75L8,12V4H6V20H18V4Z" />
  </Svg>
);

const CalendarIcon: React.FC<{size?: number; color?: string}> = ({
  size = 14,
  color = '#9CA3AF',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M19,3H18V1H16V3H8V1H6V3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H5V8H19V19Z" />
  </Svg>
);

const AccountIcon: React.FC<{size?: number; color?: string}> = ({
  size = 24,
  color = '#6B7280',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
  </Svg>
);

const NotionHomeScreen: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [mostCommonEmotion, setMostCommonEmotion] = useState<EmotionSummary | null>(null);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, 'Home'>>();

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        setLoading(true);
        const [entriesError, journalEntries] = await safeAwait(
          journalEntriesService.getEntries(),
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

        // Load most common emotion
        const [emotionError, emotion] = await safeAwait(getMostCommonEmotion());
        if (emotionError) {
          console.error('Error loading emotion analytics:', emotionError);
        } else {
          setMostCommonEmotion(emotion);
        }

        setLoading(false);
      };

      loadData();
    }, []),
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }

    // Check if it's yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    // Check if it's within the last week
    const daysDiff = Math.floor(
      (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysDiff < 7) {
      return date.toLocaleDateString('en-US', {weekday: 'long'});
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
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
      return `${greeting}, ${userName}!`;
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
            const [error, success] = await safeAwait(
              journalEntriesService.deleteEntry(entryId),
            );

            if (error || !success) {
              console.error('Error deleting journal entry:', error);
              Alert.alert(
                'Error',
                'Failed to delete the journal entry. Please try again.',
              );
            } else {
              setEntries(prevEntries =>
                prevEntries.filter(entry => entry.id !== entryId),
              );
            }
          },
        },
      ],
    );
  };

  const handleResetOnboarding = () => {
    Alert.alert(
      'Reset Onboarding',
      'This will reset the onboarding flow. The app will restart and show the welcome screen again. This is for testing purposes only.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await storageService.resetOnboarding();
              navigation.reset({
                index: 0,
                routes: [{name: 'Welcome'}],
              });
            } catch (error) {
              console.error('Error resetting onboarding:', error);
              Alert.alert('Error', 'Failed to reset onboarding');
            }
          },
        },
      ],
    );
  };

  const renderEntryItem = ({item}: {item: JournalEntry}) => (
    <TouchableOpacity
      style={styles.entryCard}
      onPress={() =>
        navigation.navigate('Analysis', {
          entryText: item.content,
          entryId: item.id,
          skipAI: true,
          entryTitle: item.title,
        })
      }
      activeOpacity={0.7}>
      <View style={styles.entryHeader}>
        <View style={styles.entryDateContainer}>
          <CalendarIcon size={14} color="#9CA3AF" />
          <Text style={styles.entryDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteEntry(item.id, item.title)}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <TrashIcon size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      <Text style={styles.entryTitle} numberOfLines={2}>
        {item.title}
      </Text>

      <Text style={styles.entryPreview} numberOfLines={3}>
        {item.content}
      </Text>

      <View style={styles.entryFooter}>
        <Text style={styles.readMore}>Tap to view analysis</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <BookIcon size={64} color="#E5E7EB" />
      <Text style={styles.emptyTitle}>Start Your Journey</Text>
      <Text style={styles.emptyText}>
        Your thoughts and reflections will appear here. Tap the + button to
        create your first entry.
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerContent}>
      <View style={styles.headerTop}>
        <TouchableOpacity
          onLongPress={handleResetOnboarding}
          delayLongPress={2000}
          activeOpacity={1}
          style={styles.welcomeContainer}>
          <Text style={styles.welcomeMessage}>{getWelcomeMessage()}</Text>
          <Text style={styles.welcomeSubtitle}>What's on your mind?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.accountButton}
          onPress={() => navigation.navigate('Account')}
          activeOpacity={0.7}>
          <AccountIcon size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {entries.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{entries.length}</Text>
            <Text style={styles.statLabel}>
              {entries.length === 1 ? 'Entry' : 'Entries'}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {mostCommonEmotion 
                ? `${getEmotionEmoji(mostCommonEmotion.name)} ${mostCommonEmotion.name}`
                : '💭 N/A'
              }
            </Text>
            <Text style={styles.statLabel}>Most Common Emotion</Text>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6B7280" />
          <Text style={styles.loadingText}>Loading your entries...</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          renderItem={renderEntryItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyList}
          ListHeaderComponent={renderHeader}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={styles.newEntryButton}
        onPress={() => navigation.navigate('Entry')}
        activeOpacity={0.8}>
        <PlusIcon size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  headerContent: {
    marginBottom: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeContainer: {
    flex: 1,
  },
  welcomeMessage: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  accountButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  entryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  entryDate: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  entryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  entryPreview: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  entryFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  readMore: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  newEntryButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#111827',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default NotionHomeScreen;
