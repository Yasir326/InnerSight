import React, {useState, useEffect} from 'react';
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
} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/AppNavigator';
import {useNavigation} from '@react-navigation/native';
import {authHelpers, supabase, ensureUserProfile} from '../lib/supabase';
import {safeAwait} from '../utils/safeAwait';

// Custom Icons
const UserIcon: React.FC<{size?: number; color?: string}> = ({
  size = 24,
  color = '#6B7280',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
  </Svg>
);

const EmailIcon: React.FC<{size?: number; color?: string}> = ({
  size = 24,
  color = '#6B7280',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.11,4 20,4Z" />
  </Svg>
);

const LogoutIcon: React.FC<{size?: number; color?: string}> = ({
  size = 24,
  color = '#EF4444',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z" />
  </Svg>
);

const EditIcon: React.FC<{size?: number; color?: string}> = ({
  size = 20,
  color = '#6B7280',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" />
  </Svg>
);

const BackIcon: React.FC<{size?: number; color?: string}> = ({
  size = 24,
  color = '#374151',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" />
  </Svg>
);

const DeleteIcon: React.FC<{size?: number; color?: string}> = ({
  size = 24,
  color = '#DC2626',
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

const AccountScreen: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedName, setEditedName] = useState('');

  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
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

    setLoading(false);
  };

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
              'This is your final warning. Deleting your account will permanently remove all your data and cannot be reversed. Type "DELETE" to confirm.',
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
      // First, delete all user data from our tables
      console.log('🗑️ Deleting user profile and related data...');

      // Delete journal entries
      const {error: entriesError} = await supabase
        .from('journal_entries')
        .delete()
        .eq('user_id', user.id);

      if (entriesError) {
        console.error('Error deleting journal entries:', entriesError);
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

      // Note: For complete account deletion, you would typically need to call a server-side function
      // that has admin privileges to delete the auth user. For now, we'll just delete the user data
      // and sign them out. The auth user will remain but with no associated data.

      console.log('✅ User data deleted successfully');
      Alert.alert(
        'Account Data Deleted',
        'Your account data has been permanently deleted. You will now be signed out. Note: Your login credentials remain active - contact support for complete account removal.',
        [
          {
            text: 'OK',
            onPress: async () => {
              // Sign out to clear local session
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
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading account...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <BackIcon size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Account</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Profile Section */}
        <View style={styles.section}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <UserIcon size={32} color="#FFFFFF" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {profile?.name || 'Anonymous User'}
              </Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>
          </View>
        </View>

        {/* Account Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Information</Text>

          {/* Name Field */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldHeader}>
              <View style={styles.fieldLabelContainer}>
                <UserIcon size={20} color="#6B7280" />
                <Text style={styles.fieldLabel}>Display Name</Text>
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
                <EditIcon size={16} color="#6B7280" />
                <Text style={styles.editButtonText}>
                  {editing ? 'Cancel' : 'Edit'}
                </Text>
              </TouchableOpacity>
            </View>

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
                  style={[
                    styles.saveButton,
                    saving && styles.saveButtonDisabled,
                  ]}
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
              <Text style={styles.fieldValue}>
                {profile?.name || 'Not set'}
              </Text>
            )}
          </View>

          {/* Email Field */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldLabelContainer}>
              <EmailIcon size={20} color="#6B7280" />
              <Text style={styles.fieldLabel}>Email</Text>
            </View>
            <Text style={styles.fieldValue}>{user?.email}</Text>
            <Text style={styles.fieldNote}>Email cannot be changed</Text>
          </View>

          {/* Account Created */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Member Since</Text>
            <Text style={styles.fieldValue}>
              {user?.created_at ? formatDate(user.created_at) : 'Unknown'}
            </Text>
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>

          <TouchableOpacity style={styles.actionButton} onPress={handleSignOut}>
            <LogoutIcon size={24} color="#EF4444" />
            <Text style={styles.actionButtonTextDanger}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.dangerSectionTitle}>Danger Zone</Text>
          <Text style={styles.dangerSectionSubtitle}>
            These actions are irreversible. Please proceed with caution.
          </Text>

          <TouchableOpacity
            style={[styles.actionButton, styles.dangerActionButton]}
            onPress={handleDeleteAccount}
            disabled={saving}>
            <DeleteIcon size={24} color="#DC2626" />
            <Text style={styles.dangerActionButtonText}>
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
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 8,
  },
  fieldValue: {
    fontSize: 16,
    color: '#111827',
    marginTop: 4,
  },
  fieldNote: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editButtonText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    marginRight: 12,
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
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
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  actionButtonTextDanger: {
    fontSize: 16,
    fontWeight: '500',
    color: '#EF4444',
    marginLeft: 12,
  },
  dangerSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  dangerSectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  dangerActionButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  dangerActionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#EF4444',
    marginLeft: 12,
  },
  deleteSpinner: {
    marginLeft: 12,
  },
});

export default AccountScreen;
