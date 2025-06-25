import type React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {baseFontFamily} from '../utils/platform';

const mockResults = {
  tasks: [
    {text: 'Pack my luggage', done: false},
    {text: 'Write blog post', done: false},
    {text: 'Film a new video', done: false},
    {text: 'Collect parcel from locker', done: true},
    {text: 'Plan content calendar', done: true},
    {text: 'Pay credit card bill', done: true},
  ],
};

const ResultsScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tasks</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>To Do</Text>
          {mockResults.tasks
            .filter(task => !task.done)
            .map((task, idx) => (
              <TouchableOpacity key={idx} style={styles.taskItem}>
                <View style={styles.checkbox} />
                <Text style={styles.taskText}>{task.text}</Text>
              </TouchableOpacity>
            ))}
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Completed</Text>
          {mockResults.tasks
            .filter(task => task.done)
            .map((task, idx) => (
              <TouchableOpacity key={idx} style={styles.taskItem}>
                <View style={styles.checkboxChecked}>
                  <Text style={styles.checkmark}>✓</Text>
                </View>
                <Text style={styles.taskTextDone}>{task.text}</Text>
              </TouchableOpacity>
            ))}
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
  content: {
    padding: 20,
  },
  sectionContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
    fontFamily: baseFontFamily,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#000000',
    marginRight: 12,
  },
  checkboxChecked: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  taskText: {
    fontSize: 17,
    color: '#000000',
    fontFamily: baseFontFamily,
  },
  taskTextDone: {
    fontSize: 17,
    color: '#888888',
    textDecorationLine: 'line-through',
    fontFamily: baseFontFamily,
  },
});

export default ResultsScreen;
