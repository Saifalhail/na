import React, { useEffect } from 'react';
import { StyleSheet, Alert, View, Image } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Button } from '@/components/base/Button';
import { GradientButton } from '@/components/base/GradientButton';
import { useTwoFactorStore } from '@/store/twoFactorStore';
import { useAuthStore } from '@/store/authStore';
import { googleOAuthClientId } from '@/config/env';
import { Ionicons } from '@/components/IconFallback';
import { GoogleLogo } from '@/components/icons/GoogleLogo';

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
      responseType: AuthSession.ResponseType.Code, // Use authorization code flow with PKCE
      redirectUri,
      usePKCE: true, // Enable PKCE for security
      additionalParameters: {},
      extraParams: {},
    },
    discovery
  );

  useEffect(() => {
    if (response?.type === 'success') {
      if (response.params?.code) {
        // Authorization code flow - we have an authorization code
        handleGoogleCodeResponse(response.params);
      } else if (response.authentication) {
        // Fallback for implicit flow (shouldn't happen with our config)
        handleGoogleAuthResponse(response.authentication);
      }
    } else if (response?.type === 'error') {
      const errorMessage =
        response.error?.message || response.params?.error_description || 'Google login failed';
      console.error('Google OAuth Error:', response.error, response.params);
      onError?.(errorMessage);
      Alert.alert('Login Failed', errorMessage);
    } else if (response?.type === 'cancel') {
      onError?.('Google sign-in was cancelled');
    }
  }, [response]);

  const handleGoogleCodeResponse = async (params: any) => {
    try {
      if (!params.code) {
        throw new Error('No authorization code received');
      }

      // Exchange authorization code for tokens via backend
      // The backend should handle the code exchange securely
      const result = await loginWithGoogle({
        code: params.code,
        state: params.state,
        redirect_uri: redirectUri,
      });

      // Update user in auth store if login successful
      if (result.user) {
        updateUser(result.user);
      }

      onSuccess?.();
    } catch (error: any) {
      const errorMessage = error.message || 'Google login failed';
      console.error('Google code exchange error:', error);
      onError?.(errorMessage);
      Alert.alert('Login Failed', errorMessage);
    }
  };

  const handleGoogleAuthResponse = async (authentication: AuthSession.TokenResponse) => {
    try {
      if (!authentication.accessToken) {
        throw new Error('No access token received');
      }

      // Get user info from Google
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${authentication.accessToken}`,
        },
      });

      if (!userInfoResponse.ok) {
        throw new Error('Failed to get user info from Google');
      }

      const userInfo = await userInfoResponse.json();

      // Call backend API with Google tokens (fallback method)
      const result = await loginWithGoogle({
        id_token: authentication.idToken || '',
        access_token: authentication.accessToken,
        user_info: userInfo,
      });

      // Update user in auth store if login successful
      if (result.user) {
        updateUser(result.user);
      }

      onSuccess?.();
    } catch (error: any) {
      const errorMessage = error.message || 'Google login failed';
      console.error('Google auth token error:', error);
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
    <GoogleLogo size={20} />
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
});
