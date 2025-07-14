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

  // Use the scheme from app.json (bitesight)
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'bitesight',
    preferLocalhost: false, // Don't use localhost for OAuth
    isTripleSlashed: false,
  });
  
  if (__DEV__) {
    console.log('🌐 [OAUTH] Redirect URI:', redirectUri);
    console.log('🔑 [OAUTH] Client ID:', googleOAuthClientId ? '***' + googleOAuthClientId.slice(-4) : 'NOT_SET');
  }

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: googleOAuthClientId || '',
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.Code, // Use authorization code flow with PKCE
      redirectUri,
      usePKCE: true, // Enable PKCE for security
    },
    discovery
  );

  useEffect(() => {
    if (!response) return;
    
    if (__DEV__) {
      console.log('🔔 [OAUTH] Response received:', response.type);
      if (response.type === 'success' && 'params' in response) {
        console.log('📦 [OAUTH] Response params:', response.params);
      }
    }
    
    if (response?.type === 'success') {
      const successResponse = response as AuthSession.AuthSessionResult & { params?: any };
      if (successResponse.params?.code) {
        // Authorization code flow - we have an authorization code
        if (__DEV__) {
          console.log('✅ [OAUTH] Got authorization code');
        }
        handleGoogleCodeResponse(successResponse.params);
      } else if (response.authentication) {
        // Fallback for implicit flow (shouldn't happen with our config)
        if (__DEV__) {
          console.log('✅ [OAUTH] Got authentication token (implicit flow)');
        }
        handleGoogleAuthResponse(response.authentication);
      }
    } else if (response?.type === 'error') {
      const errorResponse = response as AuthSession.AuthSessionResult & { error?: any, params?: any };
      const errorMessage =
        errorResponse.error?.message || errorResponse.params?.error_description || 'Google login failed';
      
      if (__DEV__) {
        console.error('❌ [OAUTH] Google OAuth Error:', {
          error: errorResponse.error,
          params: errorResponse.params,
          errorMessage
        });
        
        if (errorResponse.params?.error === 'invalid_request') {
          console.error('💡 [OAUTH] Invalid request - check redirect URI configuration');
          console.error('💡 [OAUTH] Expected redirect URI:', redirectUri);
        }
      }
      
      onError?.(errorMessage);
      Alert.alert('Login Failed', errorMessage);
    } else if (response?.type === 'cancel') {
      if (__DEV__) {
        console.log('⏹️ [OAUTH] User cancelled Google sign-in');
      }
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
    // Check for placeholder values - comprehensive detection
    const isPlaceholder = !googleOAuthClientId || 
                         googleOAuthClientId === 'your_google_client_id_here' ||
                         googleOAuthClientId === 'REPLACE_WITH_OAUTH2_CLIENT_ID' ||
                         googleOAuthClientId.includes('REPLACE') ||
                         googleOAuthClientId.includes('your-') ||
                         googleOAuthClientId.length < 20;

    if (isPlaceholder) {
      if (__DEV__) {
        console.error('❌ [OAUTH] Google OAuth not configured!');
        console.error('🔑 [OAUTH] Current value:', googleOAuthClientId || 'NOT_SET');
        console.error('📦 [OAUTH] Quick Setup Guide:');
        console.error('   1. Go to https://console.cloud.google.com/apis/credentials');
        console.error('   2. Create OAuth 2.0 Client ID (type: Web application)');
        console.error('   3. Add these redirect URIs:');
        console.error('      - bitesight://');
        console.error('      - bitesight://oauth');
        console.error('      - https://auth.expo.io/@anonymous/bitesight');
        console.error('      - exp://localhost:8081');
        console.error('      - exp://127.0.0.1:8081');
        console.error('      - exp://192.168.0.161:8081');
        console.error('   4. Update EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID in frontend/.env');
        console.error('   5. Update GOOGLE_OAUTH2_CLIENT_ID in backend/.env');
        console.error('   6. Current redirect URI would be:', redirectUri);
        console.error('💡 [OAUTH] For now, use demo mode or email login!');
      }
      
      Alert.alert(
        'Development Mode: Google Sign-In Not Configured',
        'Google OAuth requires setup by a developer. For development testing, you can use:\n\n✨ Demo Mode - Try the app instantly\n📧 Email Login - Create a test account\n\nSee console for setup instructions.',
        [
          { text: 'Use Email Login', style: 'default' },
          { 
            text: 'Try Demo Mode ✨', 
            style: 'default',
            onPress: () => {
              const { demoLogin } = useAuthStore.getState();
              demoLogin().then(() => {
                onSuccess?.();
              }).catch((error) => {
                console.error('Demo login failed:', error);
                Alert.alert('Demo Failed', 'Unable to start demo mode. Please try email login.');
              });
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
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
      if (__DEV__) {
        console.log('🚀 [OAUTH] Starting Google authentication...');
      }
      const result = await promptAsync();
      // Response handling is done in the useEffect above
    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ [OAUTH] Google login error:', error);
      }
      const errorMessage = error.message || 'Failed to open Google sign-in';
      onError?.(errorMessage);
      Alert.alert('Login Failed', errorMessage);
    }
  };

  const getButtonText = () => {
    if (isSocialLoading || !discovery) {
      return 'Loading...';
    }

    // Check if Google OAuth is properly configured
    const isPlaceholder = !googleOAuthClientId || 
                         googleOAuthClientId === 'your_google_client_id_here' ||
                         googleOAuthClientId === 'REPLACE_WITH_OAUTH2_CLIENT_ID' ||
                         googleOAuthClientId.includes('REPLACE') ||
                         googleOAuthClientId.includes('your-') ||
                         googleOAuthClientId.length < 20;

    switch (provider) {
      case 'google':
        return isPlaceholder ? '⚠️ Google Sign-In (Setup Required)' : 'Continue with Google';
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
