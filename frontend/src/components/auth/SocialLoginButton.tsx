import React, { useEffect } from 'react';
import { StyleSheet, Alert, View, Image } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Button } from '@/components/base/Button';
import { GradientButton } from '@/components/base/GradientButton';
import { useTwoFactorStore } from '@/store/twoFactorStore';
import { useAuthStore } from '@/store/authStore';
import { googleOAuthClientId } from '@/config/env';
import { Ionicons } from '@expo/vector-icons';

// Ensure web browser sessions complete properly
WebBrowser.maybeCompleteAuthSession();

interface SocialLoginButtonProps {
  provider: 'google';
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const SocialLoginButton: React.FC<SocialLoginButtonProps> = ({
  provider,
  onSuccess,
  onError,
}) => {
  const { loginWithGoogle, isSocialLoading } = useTwoFactorStore();
  const { updateUser } = useAuthStore();

  // Google OAuth configuration using expo-auth-session
  const discovery = AuthSession.useAutoDiscovery('https://accounts.google.com');
  
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'nutritionai', // You can customize this scheme
    preferLocalhost: true,
    isTripleSlashed: true,
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: googleOAuthClientId || '',
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.Token,
      redirectUri,
    },
    discovery
  );

  useEffect(() => {
    if (response?.type === 'success' && response.authentication) {
      handleGoogleAuthResponse(response.authentication);
    } else if (response?.type === 'error') {
      const errorMessage = response.error?.message || 'Google login failed';
      onError?.(errorMessage);
      Alert.alert('Login Failed', errorMessage);
    } else if (response?.type === 'cancel') {
      onError?.('Google sign-in was cancelled');
    }
  }, [response]);

  const handleGoogleAuthResponse = async (authentication: AuthSession.TokenResponse) => {
    try {
      if (!authentication.accessToken) {
        throw new Error('No access token received');
      }

      // Get user info from Google
      const userInfoResponse = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${authentication.accessToken}`,
          },
        }
      );

      if (!userInfoResponse.ok) {
        throw new Error('Failed to get user info from Google');
      }

      const userInfo = await userInfoResponse.json();

      // Call backend API with Google tokens
      // Note: In a web-based flow, we typically use the access token
      // Your backend should verify this token with Google
      const result = await loginWithGoogle({
        id_token: authentication.idToken || '', // May not be available in implicit flow
        access_token: authentication.accessToken,
        user_info: userInfo, // Send user info for backend processing
      });

      // Update user in auth store if login successful
      if (result.user) {
        updateUser(result.user);
      }

      onSuccess?.();
    } catch (error: any) {
      const errorMessage = error.message || 'Google login failed';
      onError?.(errorMessage);
      Alert.alert('Login Failed', errorMessage);
    }
  };

  const handleGoogleLogin = async () => {
    if (!googleOAuthClientId) {
      Alert.alert(
        'Configuration Error',
        'Google OAuth client ID is not configured. Please check your environment settings.'
      );
      return;
    }

    if (!request) {
      Alert.alert(
        'Setup Error',
        'Google Sign-In is not properly configured. Please try again later.'
      );
      return;
    }

    try {
      const result = await promptAsync();
      // Response handling is done in the useEffect above
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to open Google sign-in';
      onError?.(errorMessage);
      Alert.alert('Login Failed', errorMessage);
    }
  };

  const getButtonText = () => {
    if (isSocialLoading || !discovery) {
      return 'Loading...';
    }

    switch (provider) {
      case 'google':
        return 'Continue with Google';
      default:
        return 'Continue with Social Login';
    }
  };

  const getGoogleIcon = () => (
    <View style={styles.iconContainer}>
      <View style={styles.googleIconWrapper}>
        <View style={[styles.googleBar, { backgroundColor: '#4285F4' }]} />
        <View style={[styles.googleBar, { backgroundColor: '#EA4335' }]} />
        <View style={[styles.googleBar, { backgroundColor: '#FBBC04' }]} />
        <View style={[styles.googleBar, { backgroundColor: '#34A853' }]} />
      </View>
    </View>
  );

  const isDisabled = isSocialLoading || !request || !discovery;

  return (
    <Button
      onPress={provider === 'google' ? handleGoogleLogin : undefined}
      variant="outline"
      disabled={isDisabled}
      loading={isSocialLoading}
      icon={getGoogleIcon()}
      iconPosition="left"
      style={styles.socialButton}
      elevation={true}
    >
      {getButtonText()}
    </Button>
  );
};

const styles = StyleSheet.create({
  socialButton: {
    width: '100%',
    marginVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3.84,
    elevation: 3,
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleIconWrapper: {
    width: 18,
    height: 18,
    position: 'relative',
  },
  googleBar: {
    position: 'absolute',
    width: 9,
    height: 9,
  },
});