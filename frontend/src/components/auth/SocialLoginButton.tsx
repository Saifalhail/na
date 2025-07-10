import React, { useEffect } from 'react';
import { StyleSheet, Alert } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { Button } from '@/components/base/Button';
import { useTheme } from '@/hooks/useTheme';
import { useTwoFactorStore } from '@/store/twoFactorStore';
import { useAuthStore } from '@/store/authStore';

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

  useEffect(() => {
    // Configure Google Sign-In
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID || '',
      offlineAccess: true,
      hostedDomain: '',
      forceCodeForRefreshToken: true,
    });
  }, []);

  const handleGoogleLogin = async () => {
    try {
      // Check if device supports Google Play Services
      await GoogleSignin.hasPlayServices();
      
      // Get the user's ID token
      const userInfo = await GoogleSignin.signIn();
      
      // Get tokens
      const tokens = await GoogleSignin.getTokens();
      
      if (!userInfo.data?.idToken || !tokens.accessToken) {
        throw new Error('Failed to get Google authentication tokens');
      }

      // Call backend API with Google tokens
      const result = await loginWithGoogle({
        id_token: userInfo.data.idToken,
        access_token: tokens.accessToken,
      });

      // Update user in auth store if login successful
      if (result.user) {
        updateUser(result.user);
      }

      onSuccess?.();
    } catch (error: any) {
      let errorMessage = 'Google login failed';
      
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        errorMessage = 'Google sign-in was cancelled';
      } else if (error.code === statusCodes.IN_PROGRESS) {
        errorMessage = 'Google sign-in is already in progress';
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        errorMessage = 'Google Play Services not available';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      onError?.(errorMessage);
      
      // Only show alert if not cancelled by user
      if (error.code !== statusCodes.SIGN_IN_CANCELLED) {
        Alert.alert('Login Failed', errorMessage);
      }
    }
  };

  const getButtonText = () => {
    if (isSocialLoading) {
      return 'Signing in...';
    }
    
    switch (provider) {
      case 'google':
        return 'Continue with Google';
      default:
        return 'Continue with Social Login';
    }
  };

  const getButtonStyle = () => {
    switch (provider) {
      case 'google':
        return {
          backgroundColor: '#FFFFFF',
          borderColor: '#E8E8E8',
          borderWidth: 1,
        };
      default:
        return {};
    }
  };

  return (
    <Button
      onPress={provider === 'google' ? handleGoogleLogin : undefined}
      variant="outline"
      disabled={isSocialLoading}
      style={[styles.socialButton, getButtonStyle()]}
    >
      {getButtonText()}
    </Button>
  );
};

const styles = StyleSheet.create({
  socialButton: {
    width: '100%',
    marginVertical: 8,
  },
});