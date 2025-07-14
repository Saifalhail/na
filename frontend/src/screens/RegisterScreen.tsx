import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Container, Spacer } from '@/components/layout';
import { Button } from '@/components/base/Button';
import { TextInput } from '@/components/base/TextInput';

import { LoadingOverlay } from '@/components/base/Loading';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { AuthStackParamList } from '@/navigation/types';
import { rs } from '@/utils/responsive';
import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateName,
} from '@/utils/validation';
import { ERROR_MESSAGES, LOADING_MESSAGES } from '@/constants';

type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;

interface Props {
  navigation: RegisterScreenNavigationProp;
}

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { register, isLoading } = useAuthStore();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    termsAccepted: true,
  });

  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    termsAccepted: '',
  });

  const validateForm = (): boolean => {
    const newErrors = {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      termsAccepted: '',
    };

    const firstNameValidation = validateName(formData.firstName);
    if (!firstNameValidation.isValid) {
      newErrors.firstName = firstNameValidation.error || '';
    }

    const lastNameValidation = validateName(formData.lastName);
    if (!lastNameValidation.isValid) {
      newErrors.lastName = lastNameValidation.error || '';
    }

    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error || '';
    }

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.error || '';
    }

    const confirmPasswordValidation = validateConfirmPassword(
      formData.password,
      formData.confirmPassword
    );
    if (!confirmPasswordValidation.isValid) {
      newErrors.confirmPassword = confirmPasswordValidation.error || '';
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== '');
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        passwordConfirm: formData.confirmPassword,
        termsAccepted: formData.termsAccepted,
      });
    } catch (error: any) {
      setErrors((prev) => ({
        ...prev,
        email: error.message || ERROR_MESSAGES.GENERIC_ERROR,
      }));
    }
  };

  const handleLogin = () => {
    navigation.navigate('Login');
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
            <Image
              source={require('../../assets/logo_cropped.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <Spacer size="md" />
            <Text style={[styles.title, { color: theme.colors.text.primary }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Join us and start your nutrition journey
            </Text>
          </View>

          <Spacer size="xxl" />

          <View style={styles.form}>
            <View style={styles.nameRow}>
              <View style={styles.nameField}>
                <TextInput
                  label="First Name"
                  value={formData.firstName}
                  onChangeText={updateFormData('firstName')}
                  error={errors.firstName}
                  placeholder="First name"
                  autoCapitalize="words"
                  autoComplete="name"
                  textContentType="name"
                />
              </View>

              <Spacer size="md" horizontal />

              <View style={styles.nameField}>
                <TextInput
                  label="Last Name"
                  value={formData.lastName}
                  onChangeText={updateFormData('lastName')}
                  error={errors.lastName}
                  placeholder="Last name"
                  autoCapitalize="words"
                  autoComplete="name"
                  textContentType="name"
                />
              </View>
            </View>

            <Spacer size="lg" />

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
              placeholder="Create a password"
              secureTextEntry
              autoComplete="password-new"
              textContentType="newPassword"
            />

            <Spacer size="lg" />

            <TextInput
              label="Confirm Password"
              value={formData.confirmPassword}
              onChangeText={updateFormData('confirmPassword')}
              error={errors.confirmPassword}
              placeholder="Confirm your password"
              secureTextEntry
              autoComplete="password-new"
              textContentType="newPassword"
            />

            <Spacer size="xl" />

            <Button
              onPress={handleRegister}
              variant="primary"
              disabled={isLoading}
              style={styles.registerButton}
            >
              {isLoading ? LOADING_MESSAGES.REGISTERING : 'Create Account'}
            </Button>

            <Spacer size="lg" />

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
              <Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
            </View>

            <Spacer size="lg" />

            <Button onPress={handleLogin} variant="text" style={styles.loginButton}>
              Already have an account? Sign In
            </Button>
          </View>

          <View style={styles.terms}>
            <Text style={[styles.termsText, { color: theme.colors.textSecondary }]}>
              By creating an account, you agree to our{' '}
              <Text style={[styles.termsLink, { color: theme.colors.primary[500] }]}>
                Terms of Service
              </Text>{' '}
              and{' '}
              <Text style={[styles.termsLink, { color: theme.colors.primary[500] }]}>
                Privacy Policy
              </Text>
            </Text>
          </View>
        </ScrollView>

        {isLoading && <LoadingOverlay visible={true} message={LOADING_MESSAGES.REGISTERING} />}
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
  headerLogo: {
    width: 60,
    height: 60,
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
  nameRow: {
    flexDirection: 'row',
  },
  nameField: {
    flex: 1,
  },
  registerButton: {
    width: '100%',
  },
  loginButton: {
    alignSelf: 'center',
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
  terms: {
    paddingTop: 20,
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    textDecorationLine: 'underline',
  },
});
