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
  Image,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/AppNavigator';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {journalEntriesService, JournalEntry} from '../services/journalEntries';
import {safeAwait} from '../utils/safeAwait';
import {getUserName} from '../services/onboarding';
import {getMostCommonEmotion, getEmotionEmoji, type EmotionSummary} from '../services/emotionAnalytics';
import {getMostCommonTheme, getThemeEmoji, type ThemeSummary} from '../services/themeAnalytics';
import {getStreakEmoji, getStreakMessage, type StreakSummary, analyzeUserStreaks} from '../services/streakAnalytics';
import { Path } from 'react-native-svg';
import Svg from 'react-native-svg';

const TrashIcon: React.FC<{size?: number; color?: string}> = ({
  size = 16,
  color = '#666666',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
  </Svg>
);

const JournalIcon: React.FC<{size?: number; color?: string}> = ({
  size = 16,
  color = '#000000',
}) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <Path d="M5 10.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5zm0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z" />
    <Path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2z" />
    <Path d="M1 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0V8h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1z" />
  </Svg>
);

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

interface CategoryItemProps {
  item: {
    name: string;
    icon: string;
    color: string;
    value: string;
  };
}

const CategoryItem: React.FC<CategoryItemProps> = React.memo(({item}) => (
  <TouchableOpacity style={styles.categoryItem}>
    <View style={[styles.categoryIcon, {backgroundColor: item.color}]}>
      <Text style={styles.categoryEmoji}>{item.icon}</Text>
    </View>
    <View style={styles.categoryContent}>
      <Text style={styles.categoryName}>{item.name}</Text>
      <Text style={styles.categoryValue}>{item.value}</Text>
    </View>
  </TouchableOpacity>
));

interface EntryItemProps {
  item: JournalEntry;
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
  onDelete: (entryId: string, entryTitle: string) => void;
}

const EntryItem: React.FC<EntryItemProps> = React.memo(
  ({item, navigation, onDelete}) => (
    <TouchableOpacity
      style={styles.entryItem}
      onPress={() =>
        navigation.navigate('Analysis', {
          entryText: item.content,
          entryId: item.id,
          skipAI: true,
          entryTitle: item.title,
        })
      }>
      <View style={styles.entryHeader}>
        <View style={styles.entryIconContainer}>
          <Text style={styles.entryIcon}>📝</Text>
        </View>
        <View style={styles.entryContent}>
          <Text style={styles.entryTitle}>{item.title}</Text>
          <Text style={styles.entryDescription} numberOfLines={2}>
            {item.content}
          </Text>
          <View style={styles.entryMeta}>
            <Text style={styles.entryLocation}>📍 Personal Journal</Text>
            <Text style={styles.entryDate}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>
        <View style={styles.entryActions}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => navigation.navigate('EntryDetail', {entryId: item.id})}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <JournalIcon size={18} color="#666666" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDelete(item.id, item.title)}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <TrashIcon size={18} color="#666666" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  ),
);

const HomeScreen: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [mostCommonEmotion, setMostCommonEmotion] = useState<EmotionSummary | null>(null);
  const [mostCommonTheme, setMostCommonTheme] = useState<ThemeSummary | null>(null);
  const [streakData, setStreakData] = useState<StreakSummary | null>(null);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, 'Home'>>();

  // Load data when screen comes into focus
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
          setEntries(journalEntries || []);
        }

        if (nameError) {
          console.error('Error loading user name:', nameError);
        } else {
          setUserName(name);
        }

        // Load analytics data
        const [emotionError, emotion] = await safeAwait(getMostCommonEmotion());
        if (emotionError) {
          console.error('Error loading emotion analytics:', emotionError);
        } else {
          setMostCommonEmotion(emotion);
        }

        const [themeError, theme] = await safeAwait(getMostCommonTheme());
        if (themeError) {
          console.error('Error loading theme analytics:', themeError);
        } else {
          setMostCommonTheme(theme);
        }

        const [streakError, streak] = await safeAwait(analyzeUserStreaks());
        if (streakError) {
          console.error('Error loading streak analytics:', streakError);
        } else {
          setStreakData(streak);
        }

        setLoading(false);
      };

      loadData();
    }, []),
  );


  const getWelcomeMessage = () => {
    if (userName && userName.trim()) {
      return `${userName}'s Journal`;
    }
    return 'My Journal';
  };

  const getCurrentDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getThisWeekComparison = () => {
    const thisWeek = entries.filter(entry => {
      const entryDate = new Date(entry.createdAt);
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      return entryDate >= weekAgo;
    }).length;

    const lastWeek = entries.filter(entry => {
      const entryDate = new Date(entry.createdAt);
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
      return entryDate >= twoWeeksAgo && entryDate < weekAgo;
    }).length;

    if (lastWeek === 0) return 'First week of journaling';
    const percentage = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
    if (percentage > 0) return `${percentage}% more than last week`;
    if (percentage < 0) return `${Math.abs(percentage)}% less than last week`;
    return 'Same as last week';
  };

  const handleDeleteEntry = (entryId: string, entryTitle: string) => {
    Alert.alert('Delete Entry', `Are you sure you want to delete "${entryTitle}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const [error, success] = await safeAwait(
            journalEntriesService.deleteEntry(entryId),
          );

          if (error || !success) {
            console.error('Error deleting journal entry:', error);
            Alert.alert('Error', 'Failed to delete entry');
          } else {
            setEntries(prev => prev.filter(entry => entry.id !== entryId));
          }
        },
      },
    ]);
  };

  const categories: CategoryItemProps['item'][] = [
    {
      name: 'Emotion',
      icon: mostCommonEmotion ? getEmotionEmoji(mostCommonEmotion.name) : '��',
      color: '#000000',
      value: mostCommonEmotion?.name || 'N/A',
    },
    {
      name: 'Theme',
      icon: mostCommonTheme ? getThemeEmoji(mostCommonTheme.name) : '📝',
      color: '#333333',
      value: mostCommonTheme?.name || 'N/A',
    },
    {
      name: 'Streak',
      icon: streakData ? getStreakEmoji(streakData.currentStreak) : '🔥',
      color: '#666666',
      value: streakData ? `${streakData.currentStreak} days` : '0 days',
    },
    {
      name: 'Entries',
      icon: '📚',
      color: '#999999',
      value: `${entries.length} total`,
    },
  ];

  const renderCategoryItem = useCallback(
    ({item}: {item: CategoryItemProps['item']}) => (
      <CategoryItem item={item} />
    ),
    [],
  );

  const renderEntryItem = useCallback(
    ({item}: {item: JournalEntry}) => (
      <EntryItem item={item} navigation={navigation} onDelete={handleDeleteEntry} />
    ),
    [navigation, handleDeleteEntry],
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>Start Your Journey</Text>
      <Text style={styles.emptyText}>
        Your thoughts and reflections will appear here.
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View>
      <View style={styles.headerContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>{getWelcomeMessage()}</Text>
            <Text style={styles.headerSubtitle}>Personal reflection</Text>
          </View>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.navigate('Account')}>
            <Image
              source={require('../assets/png/logo-color-brain.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* Date and Stats */}
        <View style={styles.dateSection}>
          <Text style={styles.currentDate}>{getCurrentDate()}</Text>
          <Text style={styles.comparison}>{getThisWeekComparison()}</Text>
        </View>
      </View>

      {/* Analytics Categories */}
      <View style={styles.analyticsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ANALYTICS</Text>
          <View style={styles.categoryCount}>
            <Text style={styles.categoryCountText}>4</Text>
          </View>
        </View>
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          numColumns={2}
          scrollEnabled={false}
          contentContainerStyle={styles.categoriesGrid}
        />
        {streakData && (
          <View style={styles.streakMessage}>
            <Text style={styles.streakMessageText}>
              {getStreakMessage(streakData.currentStreak)}
            </Text>
          </View>
        )}
      </View>

      {/* Recent Entries */}
      {entries.length > 0 && (
        <View style={styles.entriesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>RECENT ENTRIES</Text>
            <View style={styles.categoryCount}>
              <Text style={styles.categoryCountText}>{entries.length}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Loading your journal...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={entries}
        renderItem={renderEntryItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.newEntryButton}
        onPress={() => navigation.navigate('Entry')}>
        <Text style={styles.newEntryButtonText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  listContent: {
    paddingBottom: 100,
  },
  headerContent: {
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    marginBottom: 8,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  menuButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    padding: 0,
    zIndex: 1,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#E0E0E0',
  },
  logoImage: {
    width: 44,
    height: 44,
  },
  dateSection: {
    marginBottom: 32,
  },
  currentDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  comparison: {
    fontSize: 14,
    color: '#666666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  analyticsSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  categoryCount: {
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  categoriesGrid: {
    gap: 12,
  },
  categoryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginHorizontal: 4,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryContent: {
    flex: 1,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  categoryValue: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  streakMessage: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
  },
  streakMessageText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  entriesSection: {

    marginHorizontal: 20,
    alignItems: 'center',
  },
  entryItem: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  entryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  entryIcon: {
    fontSize: 18,
  },
  entryContent: {
    flex: 1,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  entryDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  entryMeta: {
    marginBottom: 12,
  },
  entryLocation: {
    fontSize: 12,
    color: '#999999',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  entryDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999999',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  entryActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  newEntryButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#000000',
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
  newEntryButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '300',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
});

export default HomeScreen;
