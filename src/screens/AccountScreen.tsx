import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/AppNavigator';
import {useNavigation} from '@react-navigation/native';
import {authHelpers, supabase, ensureUserProfile} from '../lib/supabase';
import {safeAwait} from '../utils/safeAwait';
import {journalEntriesService} from '../services/journalEntries';
import {analyzeUserStreaks} from '../services/streakAnalytics';

// Custom Icons
const BackIcon: React.FC<{size?: number; color?: string}> = ({
  size = 24,
  color = '#000000',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" />
  </Svg>
);

const DeleteIcon: React.FC<{size?: number; color?: string}> = ({
  size = 24,
  color = '#666666',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
  </Svg>
);

interface UserProfile {
  id: string;
  user_id: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

interface UserStats {
  totalEntries: number;
  currentStreak: number;
  totalTimeEstimate: string;
}

const AccountScreen: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userStats, setUserStats] = useState<UserStats>({
    totalEntries: 0,
    currentStreak: 0,
    totalTimeEstimate: '0h',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedName, setEditedName] = useState('');

  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const loadUserStats = useCallback(async () => {
    // Get journal entries count
    const [, entries] = await safeAwait(journalEntriesService.getEntries());
    const totalEntries = entries?.length || 0;

    // Get streak data
    const [, streakData] = await safeAwait(analyzeUserStreaks());
    const currentStreak = streakData?.currentStreak || 0;

    // Estimate total time (rough calculation: 5 minutes per entry)
    const totalMinutes = totalEntries * 5;
    const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
    const totalTimeEstimate = totalHours >= 1 ? `${totalHours}h` : `${totalMinutes}m`;

    setUserStats({
      totalEntries,
      currentStreak,
      totalTimeEstimate,
    });
  }, []);

  const loadUserData = useCallback(async () => {
    setLoading(true);

    // Get current user
    const [userError, userData] = await safeAwait(authHelpers.getCurrentUser());
    if (userError || !userData.user) {
      console.error('Error loading user:', userError);
      setLoading(false);
      return;
    }

    setUser(userData.user);

    // Get user profile
    const [profileError, profileData] = await safeAwait(ensureUserProfile());
    if (profileError) {
      console.error('Error loading profile:', profileError);
    } else {
      setProfile(profileData);
      setEditedName(profileData?.name || '');
    }

    // Load user stats
    await loadUserStats();

    setLoading(false);
  }, [loadUserStats]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleSaveProfile = async () => {
    if (!profile || !user) return;

    setSaving(true);

    try {
      const {error} = await supabase
        .from('profiles')
        .update({name: editedName.trim() || null})
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        Alert.alert('Error', 'Failed to update profile. Please try again.');
      } else {
        setProfile(prev =>
          prev ? {...prev, name: editedName.trim() || null} : null,
        );
        setEditing(false);
        Alert.alert('Success', 'Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }

    setSaving(false);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          const [error] = await safeAwait(authHelpers.signOut());
          if (error) {
            console.error('Error signing out:', error);
            Alert.alert('Error', 'Failed to sign out. Please try again.');
          }
          // Navigation will be handled automatically by the auth state change listener
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you absolutely sure you want to delete your account? This action cannot be undone and will permanently delete all your data including journal entries, analysis, and profile information.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              'Final Confirmation',
              'This is your final warning. Deleting your account will permanently remove all your data and cannot be reversed.',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'I understand, delete my account',
                  style: 'destructive',
                  onPress: performAccountDeletion,
                },
              ],
            );
          },
        },
      ],
    );
  };

  const performAccountDeletion = async () => {
    if (!user) return;

    setSaving(true);

    try {
      // Delete all user data from our tables
      console.log('🗑️ Deleting user profile and related data...');

      // Delete journal entries
      const {error: entriesError} = await supabase
        .from('journal_entries')
        .delete()
        .eq('user_id', user.id);

      if (entriesError) {
        console.error('Error deleting journal entries:', entriesError);
      }

      // Delete streak data
      const {error: streaksError} = await supabase
        .from('user_streaks')
        .delete()
        .eq('user_id', user.id);

      if (streaksError) {
        console.error('Error deleting streak data:', streaksError);
      }

      // Delete onboarding data
      const {error: onboardingError} = await supabase
        .from('onboarding_data')
        .delete()
        .eq('user_id', user.id);

      if (onboardingError) {
        console.error('Error deleting onboarding data:', onboardingError);
      }

      // Delete profile
      const {error: profileError} = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user.id);

      if (profileError) {
        console.error('Error deleting profile:', profileError);
      }

      console.log('✅ User data deleted successfully');
      Alert.alert(
        'Account Data Deleted',
        'Your account data has been permanently deleted. You will now be signed out.',
        [
          {
            text: 'OK',
            onPress: async () => {
              await authHelpers.signOut();
            },
          },
        ],
      );
    } catch (error) {
      console.error('Error during account deletion:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred while deleting your account data. Please try again or contact support.',
      );
    }

    setSaving(false);
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'This feature will allow you to download all your journal entries and data. Coming soon!',
      [{text: 'OK'}],
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
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
          <Text style={styles.loadingText}>Loading account...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <BackIcon size={24} color="#000000" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Account Settings</Text>
            <Text style={styles.headerSubtitle}>Manage your profile</Text>
          </View>
          <TouchableOpacity style={styles.menuButton}>
            <Text style={styles.menuDots}>⋯</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {profile?.name ? profile.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.name || 'Anonymous User'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'Personal Journal'}</Text>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{userStats.totalEntries}</Text>
            <Text style={styles.statLabel}>Entries</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{userStats.currentStreak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{userStats.totalTimeEstimate}</Text>
            <Text style={styles.statLabel}>Total Time</Text>
          </View>
        </View>

        {/* Profile Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>PROFILE SETTINGS</Text>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Text style={styles.settingEmoji}>👤</Text>
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Display Name</Text>
              {editing ? (
                <View style={styles.editContainer}>
                  <TextInput
                    style={styles.textInput}
                    value={editedName}
                    onChangeText={setEditedName}
                    placeholder="Enter your name"
                    placeholderTextColor="#9CA3AF"
                  />
                  <TouchableOpacity
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                    onPress={handleSaveProfile}
                    disabled={saving}>
                    {saving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.settingValue}>{profile?.name || 'Not set'}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => {
                if (editing) {
                  setEditedName(profile?.name || '');
                  setEditing(false);
                } else {
                  setEditing(true);
                }
              }}>
              <Text style={styles.editButtonText}>{editing ? 'Cancel' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Text style={styles.settingEmoji}>📧</Text>
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Email</Text>
              <Text style={styles.settingValue}>{user?.email}</Text>
            </View>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Text style={styles.settingEmoji}>📅</Text>
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Member Since</Text>
              <Text style={styles.settingValue}>
                {user?.created_at ? formatDate(user.created_at) : 'Unknown'}
              </Text>
            </View>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Text style={styles.settingEmoji}>🔒</Text>
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Privacy</Text>
              <Text style={styles.settingValue}>All entries are private</Text>
            </View>
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>APP SETTINGS</Text>
          </View>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Text style={styles.settingEmoji}>🔔</Text>
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Notifications</Text>
              <Text style={styles.settingValue}>Coming soon</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Text style={styles.settingEmoji}>📱</Text>
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>App Theme</Text>
              <Text style={styles.settingValue}>Light mode</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleExportData}>
            <View style={styles.settingIcon}>
              <Text style={styles.settingEmoji}>💾</Text>
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Export Data</Text>
              <Text style={styles.settingValue}>Download your journal</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.actionButton} onPress={handleSignOut}>
            <View style={styles.actionIcon}>
              <Text style={styles.actionEmoji}>🚪</Text>
            </View>
            <Text style={styles.actionText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.dangerSectionTitle}>DANGER ZONE</Text>
            <Text style={styles.dangerSectionSubtitle}>
              These actions are irreversible. Please proceed with caution.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.dangerActionButton}
            onPress={handleDeleteAccount}
            disabled={saving}>
            <View style={styles.dangerActionIcon}>
              <DeleteIcon size={18} color="#666666" />
            </View>
            <Text style={styles.dangerActionText}>
              {saving ? 'Deleting...' : 'Delete Account'}
            </Text>
            {saving && (
              <ActivityIndicator
                size="small"
                color="#DC2626"
                style={styles.deleteSpinner}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>InnerSight Journal v1.0.0</Text>
          <Text style={styles.footerSubtext}>Made with ❤️ for mindful reflection</Text>
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
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    backgroundColor: '#F8F8F8',
  },
  backButton: {
    padding: 8,
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
    padding: 8,
  },
  menuDots: {
    fontSize: 20,
    color: '#666666',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  profileEmail: {
    fontSize: 14,
    color: '#666666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F8F8F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  settingEmoji: {
    fontSize: 18,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  settingValue: {
    fontSize: 14,
    color: '#666666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  editButtonText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#000000',
    backgroundColor: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  saveButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  chevron: {
    fontSize: 18,
    color: '#999999',
    marginLeft: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F8F8F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  actionEmoji: {
    fontSize: 18,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  dangerSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: 0.5,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  dangerSectionSubtitle: {
    fontSize: 12,
    color: '#666666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  dangerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginTop: 12,
  },
  dangerActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dangerActionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  deleteSpinner: {
    marginLeft: 12,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#999999',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
});

export default AccountScreen;
