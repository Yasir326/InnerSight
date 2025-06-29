import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {authHelpers} from '../lib/supabase';
import {safeAwait} from '../utils/safeAwait';
import {supabase} from '../lib/supabase';
import {baseFontFamily} from '../utils/platform';
import {debugLog} from '../utils/logger';

// Use Supabase's UserIdentity type directly
type UserIdentity = {
  id: string;
  user_id: string;
  identity_data?: {[key: string]: any};
  identity_id: string;
  provider: string;
  created_at: string;
  updated_at: string;
};

// Icons
const GoogleIcon: React.FC<{size?: number}> = ({size = 20}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </Svg>
);

const AppleIcon: React.FC<{size?: number; color?: string}> = ({
  size = 20,
  color = '#000000',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M17.05 20.28c-.98.95-2.05.86-3.08.38-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.38C2.79 15.15 3.51 7.2 9.05 6.89c1.65.08 2.78 1.12 3.75 1.14 1.2-.09 2.4-1.16 3.89-1.14 1.38.08 2.41.43 3.09 1.12-2.73 1.83-2.28 5.18.26 6.75-.67 1.93-1.5 3.8-2.99 5.52zM12.03 6.77c-.14-2.76 2.11-5.1 4.8-5.27.27 2.8-2.48 5.4-4.8 5.27z" />
  </Svg>
);

const EmailIcon: React.FC<{size?: number; color?: string}> = ({
  size = 20,
  color = '#666666',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.11,4 20,4Z" />
  </Svg>
);

const UnlinkIcon: React.FC<{size?: number; color?: string}> = ({
  size = 16,
  color = '#666666',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M17,7H22V9H19V12C19,13.11 18.11,14 17,14H14V12H17V7M7,17H2V15H5V12C5,10.89 5.89,10 7,10H10V12H7V17Z" />
  </Svg>
);

const LinkIcon: React.FC<{size?: number; color?: string}> = ({
  size = 16,
  color = '#007AFF',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M3.9,12C3.9,10.29 5.29,8.9 7,8.9H11V7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H11V15.1H7C5.29,15.1 3.9,13.71 3.9,12M8,13H16V11H8V13M17,7H13V8.9H17C18.71,8.9 20.1,10.29 20.1,12C20.1,13.71 18.71,15.1 17,15.1H13V17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7Z" />
  </Svg>
);

interface IdentityManagerProps {
  onIdentitiesChanged?: () => void;
}

export const IdentityManager: React.FC<IdentityManagerProps> = ({
  onIdentitiesChanged,
}) => {
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadIdentities = useCallback(async () => {
    setLoading(true);

    // Add retry logic for session timing issues
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        // First check if we have a valid session
        const {
          data: {session},
        } = await supabase.auth.getSession();

        if (!session) {
          if (__DEV__) {
            debugLog('⚠️ No session found, retrying...', retryCount + 1);
          }
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            continue;
          } else {
            console.error('❌ No session available after retries');
            Alert.alert(
              'Error',
              'Please sign in again to manage linked accounts',
            );
            setLoading(false);
            return;
          }
        }

        // Now try to get identities
        const [error, result] = await safeAwait(
          authHelpers.getUserIdentities(),
        );

        if (error) {
          // Check if it's a session error and we can retry
          if (
            error.message?.includes('Auth session missing') &&
            retryCount < maxRetries - 1
          ) {
            if (__DEV__) {
              debugLog(
                '⚠️ Session missing error, retrying...',
                retryCount + 1,
              );
            }
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            continue;
          }

          console.error('Error loading identities:', error);
          Alert.alert('Error', 'Failed to load linked accounts');
        } else {
          setIdentities((result?.identities || []) as UserIdentity[]);
        }

        break; // Success, exit retry loop
      } catch (error) {
        console.error('Unexpected error in loadIdentities:', error);
        if (retryCount < maxRetries - 1) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        } else {
          Alert.alert('Error', 'Failed to load linked accounts');
          break;
        }
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadIdentities();
  }, [loadIdentities]);

  const handleLinkIdentity = async (provider: 'google' | 'apple') => {
    setActionLoading(`link-${provider}`);

    const [error, _result] = await safeAwait(
      authHelpers.linkIdentity(provider),
    );

    if (error) {
      console.error('Error linking identity:', error);
      const errorMessage =
        typeof error === 'object' && 'message' in error
          ? (error as any).message
          : 'Failed to link account';
      Alert.alert('Link Account Error', errorMessage);
    } else {
      Alert.alert(
        'Account Linked!',
        `Your ${provider} account has been successfully linked.`,
        [
          {
            text: 'OK',
            onPress: () => {
              loadIdentities();
              onIdentitiesChanged?.();
            },
          },
        ],
      );
    }

    setActionLoading(null);
  };

  const handleUnlinkIdentity = (identity: UserIdentity) => {
    if (identities.length <= 1) {
      Alert.alert(
        'Cannot Unlink',
        'You must have at least one linked account to sign in. Please add another authentication method before unlinking this one.',
      );
      return;
    }

    Alert.alert(
      'Unlink Account',
      `Are you sure you want to unlink your ${identity.provider} account? You will no longer be able to sign in using this method.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: () => performUnlinkIdentity(identity),
        },
      ],
    );
  };

  const performUnlinkIdentity = async (identity: UserIdentity) => {
    setActionLoading(`unlink-${identity.id}`);

    const [error] = await safeAwait(authHelpers.unlinkIdentity(identity));

    if (error) {
      console.error('Error unlinking identity:', error);
      const errorMessage =
        typeof error === 'object' && 'message' in error
          ? (error as any).message
          : 'Failed to unlink account';
      Alert.alert('Unlink Account Error', errorMessage);
    } else {
      Alert.alert(
        'Account Unlinked',
        `Your ${identity.provider} account has been unlinked.`,
        [
          {
            text: 'OK',
            onPress: () => {
              loadIdentities();
              onIdentitiesChanged?.();
            },
          },
        ],
      );
    }

    setActionLoading(null);
  };

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'google':
        return <GoogleIcon size={20} />;
      case 'apple':
        return <AppleIcon size={20} color="#000000" />;
      case 'email':
        return <EmailIcon size={20} color="#666666" />;
      default:
        return <EmailIcon size={20} color="#666666" />;
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'google':
        return 'Google';
      case 'apple':
        return 'Apple';
      case 'email':
        return 'Email & Password';
      default:
        return provider.charAt(0).toUpperCase() + provider.slice(1);
    }
  };

  const hasProvider = (provider: string) => {
    return identities.some(identity => identity.provider === provider);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#666666" />
        <Text style={styles.loadingText}>Loading linked accounts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Linked Accounts</Text>
      <Text style={styles.subtitle}>
        Manage how you sign in to your account. You can link multiple accounts
        for easier access.
      </Text>

      {/* Current Linked Identities */}
      <View style={styles.identitiesContainer}>
        {identities.map(identity => (
          <View key={identity.id} style={styles.identityItem}>
            <View style={styles.identityIcon}>
              {getProviderIcon(identity.provider)}
            </View>
            <View style={styles.identityContent}>
              <Text style={styles.identityProvider}>
                {getProviderName(identity.provider)}
              </Text>
              <Text style={styles.identityEmail}>
                {identity.identity_data?.email || 'Connected'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.unlinkButton}
              onPress={() => handleUnlinkIdentity(identity)}
              disabled={actionLoading !== null}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              {actionLoading === `unlink-${identity.id}` ? (
                <ActivityIndicator size="small" color="#666666" />
              ) : (
                <UnlinkIcon size={16} color="#666666" />
              )}
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Available Providers to Link */}
      <View style={styles.availableContainer}>
        <Text style={styles.availableTitle}>Add Authentication Method</Text>

        {!hasProvider('google') && (
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => handleLinkIdentity('google')}
            disabled={actionLoading !== null}>
            <View style={styles.linkButtonIcon}>
              <GoogleIcon size={20} />
            </View>
            <Text style={styles.linkButtonText}>Link Google Account</Text>
            <View style={styles.linkButtonAction}>
              {actionLoading === 'link-google' ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <LinkIcon size={16} color="#007AFF" />
              )}
            </View>
          </TouchableOpacity>
        )}

        {Platform.OS === 'ios' && !hasProvider('apple') && (
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => handleLinkIdentity('apple')}
            disabled={actionLoading !== null}>
            <View style={styles.linkButtonIcon}>
              <AppleIcon size={20} color="#000000" />
            </View>
            <Text style={styles.linkButtonText}>Link Apple Account</Text>
            <View style={styles.linkButtonAction}>
              {actionLoading === 'link-apple' ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <LinkIcon size={16} color="#007AFF" />
              )}
            </View>
          </TouchableOpacity>
        )}
      </View>

      {identities.length > 0 && (
        <Text style={styles.footerNote}>
          💡 Having multiple sign-in options makes it easier to access your
          account if you forget one method.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#666666',
    fontFamily: baseFontFamily,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
    fontFamily: baseFontFamily,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 20,
    fontFamily: baseFontFamily,
  },
  identitiesContainer: {
    marginBottom: 24,
  },
  identityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  identityIcon: {
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
  identityContent: {
    flex: 1,
  },
  identityProvider: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
    fontFamily: baseFontFamily,
  },
  identityEmail: {
    fontSize: 14,
    color: '#666666',
    fontFamily: baseFontFamily,
  },
  unlinkButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  availableContainer: {
    marginBottom: 20,
  },
  availableTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 12,
    fontFamily: baseFontFamily,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  linkButtonIcon: {
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
  linkButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    fontFamily: baseFontFamily,
  },
  linkButtonAction: {
    padding: 4,
  },
  footerNote: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 16,
    textAlign: 'center',
    fontFamily: baseFontFamily,
  },
});

export default IdentityManager;
