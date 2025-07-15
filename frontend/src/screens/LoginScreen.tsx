import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  SafeAreaView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { UnifiedButton } from '@/components/base/UnifiedButton';
import { TextInput } from '@/components/base/TextInput';
import { UnifiedCard } from '@/components/base/UnifiedCard';
import { SocialLoginButton } from '@/components/auth/SocialLoginButton';
import { UnifiedIcon, UNIFIED_ICONS } from '@/components/base/UnifiedIcon';
import { UI } from '@/constants/uiConstants';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { AuthStackParamList } from '@/navigation/types';
import { validateEmail, validateRequired } from '@/utils/validation';
import { APP_CONFIG, ERROR_MESSAGES, LOADING_MESSAGES } from '@/constants';
import { enableSocialAuth } from '@/config/env';
import { Ionicons } from '@/components/IconFallback';
import { Alert } from 'react-native';
import { spacing, layout } from '@/theme/spacing';
import { textPresets } from '@/theme/typography';
import * as Haptics from 'expo-haptics';

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { login, demoLogin, isLoading } = useAuthStore();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });

  const validateForm = (): boolean => {
    const newErrors = {
      email: '',
      password: '',
    };

    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error || '';
    }

    const passwordValidation = validateRequired(formData.password, 'Password');
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.error || '';
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== '');
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await login({ email: formData.email, password: formData.password });
    } catch (error: any) {
      setErrors({
        email: '',
        password: error.message || ERROR_MESSAGES.GENERIC_ERROR,
      });
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  const handleDemoLogin = async () => {
    try {
      await demoLogin();
    } catch (error: any) {
      Alert.alert('Demo Login Failed', 'Unable to start demo session. Please try again.');
    }
  };

  const updateFormData = (field: keyof typeof formData) => (value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/logo_cropped.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to continue your nutrition journey
            </Text>
          </View>

          {/* Form Section */}
          <UnifiedCard 
            size="large" 
            animated={true}
            animationType="fadeUp"
            style={styles.formCard}
          >
            <View style={styles.form}>
              <TextInput
                label="Email"
                value={formData.email}
                onChangeText={updateFormData('email')}
                error={errors.email}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                leftIcon={
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={theme.colors.text.secondary}
                  />
                }
                variant="outlined"
              />

              <TextInput
                label="Password"
                value={formData.password}
                onChangeText={updateFormData('password')}
                error={errors.password}
                placeholder="Enter your password"
                secureTextEntry
                autoComplete="password"
                textContentType="password"
                leftIcon={
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={theme.colors.text.secondary}
                  />
                }
                variant="outlined"
              />

              <UnifiedButton 
                onPress={handleForgotPassword} 
                variant="ghost" 
                style={styles.forgotButton}
              >
                Forgot Password?
              </UnifiedButton>

              <UnifiedButton
                onPress={handleLogin}
                variant="primary"
                size="large"
                fullWidth
                loading={isLoading}
                style={styles.loginButton}
              >
                {isLoading ? LOADING_MESSAGES.LOGGING_IN : 'Sign In'}
              </UnifiedButton>

              {enableSocialAuth && (
                <>
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <SocialLoginButton
                    provider="google"
                    onSuccess={() => {
                      // Navigation will be handled by auth store
                    }}
                    onError={(error) => {
                      setErrors({
                        email: '',
                        password: error,
                      });
                    }}
                  />
                </>
              )}

              {APP_CONFIG.ENABLE_DEMO_MODE && (
                <UnifiedButton
                  onPress={handleDemoLogin}
                  variant="primary"
                  size="large"
                  fullWidth
                  style={styles.demoButton}
                  icon={<UnifiedIcon name={UNIFIED_ICONS.info} size="small" variant="white" />}
                  iconPosition="left"
                >
                  Continue with Demo
                </UnifiedButton>
              )}

              <UnifiedButton
                onPress={handleRegister}
                variant="secondary"
                size="large"
                fullWidth
                style={styles.registerButton}
              >
                Create New Account
              </UnifiedButton>
            </View>
          </UnifiedCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.isDark ? theme.colors.background : '#FFFFFF',
    },
    keyboardContainer: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: layout.screenPadding,
      paddingTop: spacing['16'], // 64px
      paddingBottom: spacing['10'], // 40px
      justifyContent: 'center',
      minHeight: '100%',
    },
    header: {
      alignItems: 'center',
      marginBottom: spacing['8'], // 32px
    },
    logoContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing['4'], // 16px
      ...UI.shadows.premium,
    },
    logo: {
      width: 60,
      height: 60,
    },
    title: {
      ...textPresets.h1,
      color: theme.isDark ? theme.colors.text.primary : '#000000',
      marginBottom: spacing['2'], // 8px
      textAlign: 'center',
      fontWeight: '700',
    },
    subtitle: {
      ...textPresets.body,
      color: theme.isDark ? theme.colors.text.secondary : '#666666',
      textAlign: 'center',
      lineHeight: spacing['6'], // 24px
      paddingHorizontal: spacing['4'], // 16px
    },
    formCard: {
      marginHorizontal: spacing['0'], // No extra margin since Card handles padding
      marginBottom: spacing['6'], // 24px
    },
    form: {
      gap: spacing['5'], // 20px between form elements
    },
    forgotButton: {
      alignSelf: 'flex-end',
      marginTop: -spacing['2'], // -8px to bring closer to password input
    },
    loginButton: {
      marginTop: spacing['2'], // 8px
    },
    registerButton: {
      marginTop: spacing['2'], // 8px
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: spacing['5'], // 20px
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.border,
    },
    dividerText: {
      ...textPresets.caption,
      color: theme.colors.text.secondary,
      paddingHorizontal: spacing['3'], // 12px
      backgroundColor: theme.colors.surface,
      fontWeight: theme.typography.fontWeight.medium,
    },
    demoButton: {
      marginTop: spacing['3'], // 12px
      marginBottom: spacing['2'], // 8px
    },
  });
