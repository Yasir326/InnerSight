import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {authHelpers} from '../lib/supabase';
import {getErrorMessage} from '../utils/error';

const baseFontFamily = Platform.OS === 'ios' ? 'System' : 'normal';

// Google Logo Icon
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

// Apple Logo Icon
const AppleIcon: React.FC<{size?: number; color?: string}> = ({
  size = 20,
  color = '#FFFFFF',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M17.05 20.28c-.98.95-2.05.86-3.08.38-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.38C2.79 15.15 3.51 7.2 9.05 6.89c1.65.08 2.78 1.12 3.75 1.14 1.2-.09 2.4-1.16 3.89-1.14 1.38.08 2.41.43 3.09 1.12-2.73 1.83-2.28 5.18.26 6.75-.67 1.93-1.5 3.8-2.99 5.52zM12.03 6.77c-.14-2.76 2.11-5.1 4.8-5.27.27 2.8-2.48 5.4-4.8 5.27z" />
  </Svg>
);

const SocialButton = ({
  provider,
  title,
  icon,
  backgroundColor,
  textColor,
  loading,
  socialLoading,
  handleSocialAuth,
}: {
  provider: 'google' | 'apple';
  title: string;
  icon: React.ReactNode;
  backgroundColor: string;
  textColor: string;
  loading: boolean;
  socialLoading: string | null;
  handleSocialAuth: (provider: 'google' | 'apple') => void;
}) => (
  <TouchableOpacity
    style={[styles.socialButton, {backgroundColor}]}
    onPress={() => handleSocialAuth(provider)}
    disabled={loading || socialLoading !== null}
    activeOpacity={0.8}>
    {socialLoading === provider ? (
      <ActivityIndicator color={textColor} size="small" />
    ) : (
      <>
        <View style={styles.socialIconContainer}>{icon}</View>
        <Text style={[styles.socialButtonText, {color: textColor}]}>
          {title}
        </Text>
      </>
    )}
  </TouchableOpacity>
);

interface AuthProps {
  onAuthSuccess: () => void;
}

export const Auth: React.FC<AuthProps> = ({onAuthSuccess}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (isSignUp && !name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    console.log('🔍 Environment check in React Native:');
    console.log(
      '- SUPABASE_URL available:',
      !!process.env.EXPO_PUBLIC_SUPABASE_URL,
    );
    console.log(
      '- SUPABASE_ANON_KEY available:',
      !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    );

    if (isSignUp) {
      console.log('🚀 Attempting sign up:', {email, name});
      const {data, error} = await authHelpers.signUp(
        email.trim(),
        password,
        name.trim(),
      );
      console.log('📝 Sign up response:', {
        hasData: !!data,
        hasUser: !!data?.user,
        errorMessage: getErrorMessage(error),
        errorDetails: error,
      });

      if (error) {
        console.error('❌ Sign up error details:', error);
        const errorMessage = getErrorMessage(error);
        Alert.alert('Sign Up Error', errorMessage);
      } else {
        Alert.alert(
          'Account Created!',
          "We've sent a verification email to your inbox. Please click the link in the email to verify your account, then return here to sign in.",
          [{text: 'OK', onPress: () => setIsSignUp(false)}],
        );
      }
    }

    setLoading(false);
  };

  const handleSocialAuth = async (provider: 'google' | 'apple') => {
    setSocialLoading(provider);
    console.log('🚀 Starting social auth for:', provider);
    const {data, error} = await authHelpers.signInWithProvider(provider);

    if (error) {
      console.error('❌ Social auth error:', error);
      const errorMessage = getErrorMessage(error);
      Alert.alert('Social Sign In Error', errorMessage);
    } else if (data?.session) {
      console.log('✅ Social auth successful');
      onAuthSuccess();
    } else {
      console.log('❌ No session returned from social auth');
      Alert.alert(
        'Error',
        'Authentication completed but no session was created',
      );
    }
    setSocialLoading(null);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address first');
      return;
    }

    setLoading(true);
    const {error} = await authHelpers.resetPassword(email.trim());

    if (error) {
      const errorMessage = getErrorMessage(error);
      Alert.alert('Error', errorMessage);
    } else {
      Alert.alert('Success', 'Password reset email sent! Check your inbox.');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.authContainer}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/png/logo-grayscale.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>
              {!isSignUp ? 'Welcome Back' : 'Create Account'}
            </Text>
            <Text style={styles.subtitle}>
              {isSignUp
                ? 'Start your journaling journey'
                : 'Sign in to continue your journey'}
            </Text>
          </View>

          {/* Social Login Buttons */}
          <View style={styles.socialContainer}>
            <SocialButton
              provider="google"
              title="Continue with Google"
              icon={<GoogleIcon size={20} />}
              backgroundColor="#FFFFFF"
              textColor="#111827"
              loading={loading}
              socialLoading={socialLoading}
              handleSocialAuth={handleSocialAuth}
            />
            {Platform.OS === 'ios' && (
              <SocialButton
                provider="apple"
                title="Continue with Apple"
                icon={<AppleIcon size={20} color="#FFFFFF" />}
                backgroundColor="#000000"
                textColor="#FFFFFF"
                loading={loading}
                socialLoading={socialLoading}
                handleSocialAuth={handleSocialAuth}
              />
            )}
          </View>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email/Password Form */}
          <View style={styles.form}>
            {isSignUp && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  autoCapitalize="words"
                  autoComplete="name"
                  editable={!loading && socialLoading === null}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!loading && socialLoading === null}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                editable={!loading && socialLoading === null}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.authButton,
                (loading || socialLoading !== null) &&
                  styles.authButtonDisabled,
              ]}
              onPress={handleAuth}
              disabled={loading || socialLoading !== null}
              activeOpacity={0.8}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.authButtonText}>
                  {!isSignUp ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>

            {!isSignUp && (
              <TouchableOpacity
                style={styles.forgotButton}
                onPress={handleForgotPassword}
                disabled={loading || socialLoading !== null}
                activeOpacity={0.6}>
                <Text style={styles.forgotButtonText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            <View style={styles.switchContainer}>
              <Text style={styles.switchText}>
                {isSignUp
                  ? 'Already have an account?'
                  : "Don't have an account?"}
              </Text>
              <TouchableOpacity
                onPress={() => setIsSignUp(!isSignUp)}
                disabled={loading || socialLoading !== null}
                activeOpacity={0.6}>
                <Text style={styles.switchButtonText}>
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  authContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoImage: {
    width: 160,
    height: 160,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: baseFontFamily,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: baseFontFamily,
  },
  socialContainer: {
    marginBottom: 24,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  socialIconContainer: {
    marginRight: 12,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: baseFontFamily,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
    fontFamily: baseFontFamily,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    fontFamily: baseFontFamily,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
    color: '#111827',
    fontFamily: baseFontFamily,
  },
  authButton: {
    backgroundColor: '#111827',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  authButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: baseFontFamily,
  },
  forgotButton: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  forgotButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: baseFontFamily,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  switchText: {
    color: '#6B7280',
    fontSize: 14,
    marginRight: 4,
    fontFamily: baseFontFamily,
  },
  switchButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: baseFontFamily,
  },
});

// Export as default as well to ensure compatibility
export default Auth;
