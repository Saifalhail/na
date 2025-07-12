import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Container, Spacer } from '@/components/layout';
import { Button } from '@/components/base/Button';
import { GradientButton } from '@/components/base/GradientButton';
import { TextInput } from '@/components/base/TextInput';
import { LoadingOverlay } from '@/components/base/Loading';
import { SocialLoginButton } from '@/components/auth/SocialLoginButton';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { AuthStackParamList } from '@/navigation/types';
import { validateEmail, validateRequired } from '@/utils/validation';
import { APP_CONFIG, ERROR_MESSAGES, LOADING_MESSAGES } from '@/constants';
import { enableSocialAuth } from '@/config/env';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from 'react-native';

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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Container style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text.primary }]}>Welcome Back</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Sign in to continue your nutrition journey
            </Text>
          </View>

          <Spacer size="xxl" />

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
            />

            <Spacer size="lg" />

            <TextInput
              label="Password"
              value={formData.password}
              onChangeText={updateFormData('password')}
              error={errors.password}
              placeholder="Enter your password"
              secureTextEntry
              autoComplete="password"
              textContentType="password"
            />

            <Spacer size="md" />

            <Button onPress={handleForgotPassword} variant="text" style={styles.forgotButton}>
              Forgot Password?
            </Button>

            <Spacer size="xl" />

            <GradientButton
              onPress={handleLogin}
              variant="primary"
              size="large"
              fullWidth
              loading={isLoading}
              icon={<Ionicons name="log-in-outline" size={24} color="#FFFFFF" />}
              iconPosition="right"
            >
              {isLoading ? LOADING_MESSAGES.LOGGING_IN : 'Sign In'}
            </GradientButton>

            {enableSocialAuth && (
              <>
                <Spacer size="lg" />

                <View style={styles.divider}>
                  <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
                  <Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>or</Text>
                  <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
                </View>

                <Spacer size="lg" />

                <SocialLoginButton
                  provider="google"
                  onSuccess={() => {
                    // Handle successful social login
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

            <Spacer size="md" />

            <GradientButton
              onPress={handleRegister}
              variant="secondary"
              size="large"
              fullWidth
              icon={<Ionicons name="person-add-outline" size={22} color="#FFFFFF" />}
            >
              Create New Account
            </GradientButton>

            {APP_CONFIG.ENABLE_DEMO_MODE && (
              <>
                <Spacer size="md" />
                <Button
                  onPress={handleDemoLogin}
                  variant="text"
                  style={styles.demoButton}
                >
                  <View style={styles.demoButtonContent}>
                    <Ionicons name="eye-outline" size={20} color={theme.colors.primary[500]} style={styles.demoIcon} />
                    <Text style={[styles.demoButtonText, { color: theme.colors.primary[500] }]}>
                      Try Demo Mode
                    </Text>
                  </View>
                </Button>
              </>
            )}
          </View>
        </ScrollView>

        {isLoading && <LoadingOverlay visible={true} message={LOADING_MESSAGES.LOGGING_IN} />}
      </Container>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    flex: 1,
  },
  forgotButton: {
    alignSelf: 'flex-end',
  },
  loginButton: {
    width: '100%',
  },
  registerButton: {
    width: '100%',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  demoButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  demoButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  demoIcon: {
    marginRight: 8,
  },
  demoButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
