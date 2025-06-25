import type React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
import {baseFontFamily} from '../utils/platform';

const mockStats = {
  totalTime: '2h 30m',
  currentStreak: 5,
  totalEntries: 12,
};

const StatsScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Stats</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{mockStats.totalTime}</Text>
              <Text style={styles.statLabel}>Total Time</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>{mockStats.currentStreak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>{mockStats.totalEntries}</Text>
              <Text style={styles.statLabel}>Entries</Text>
            </View>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.activityCard}>
              <Text style={styles.activityText}>
                You've journaled 3 times this week
              </Text>
              <Text style={styles.activitySubtext}>
                That's 1 more than last week
              </Text>
            </View>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Insights</Text>
            <View style={styles.insightCard}>
              <Text style={styles.insightTitle}>Most Active Day</Text>
              <Text style={styles.insightValue}>Monday</Text>
            </View>
            <View style={styles.insightCard}>
              <Text style={styles.insightTitle}>Average Entry Length</Text>
              <Text style={styles.insightValue}>230 words</Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    fontFamily: baseFontFamily,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    paddingVertical: 20,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 6,
    fontFamily: baseFontFamily,
  },
  statLabel: {
    fontSize: 13,
    color: '#888888',
    fontFamily: baseFontFamily,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    fontFamily: baseFontFamily,
  },
  activityCard: {
    backgroundColor: '#F5F5F7',
    padding: 16,
    borderRadius: 12,
  },
  activityText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
    fontFamily: baseFontFamily,
  },
  activitySubtext: {
    fontSize: 13,
    color: '#888888',
    fontFamily: baseFontFamily,
  },
  insightCard: {
    backgroundColor: '#F5F5F7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insightTitle: {
    fontSize: 15,
    color: '#000000',
    fontFamily: baseFontFamily,
  },
  insightValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
    fontFamily: baseFontFamily,
  },
});

export default StatsScreen;
