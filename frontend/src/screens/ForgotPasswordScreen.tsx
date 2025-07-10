import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/Button';
import { TextInput } from '@/components/TextInput';
import { Spacer } from '@/components/layout/Spacer';
import { useTheme } from '@/hooks/useTheme';
import { AuthStackParamList } from '@/navigation/types';
import { validateEmail } from '@/utils/validation';

type ForgotPasswordScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

interface Props {
  navigation: ForgotPasswordScreenNavigationProp;
}

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleResetPassword = async () => {
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setError(emailValidation.error || '');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // TODO: Implement password reset API call
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate API call
      setIsSubmitted(true);
    } catch (error: any) {
      setError(error.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  if (isSubmitted) {
    return (
      <Container style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.content}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>📧</Text>
          </View>

          <Spacer size="xl" />

          <Text style={[styles.title, { color: theme.colors.text }]}>Check Your Email</Text>

          <Spacer size="md" />

          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            We've sent a password reset link to {email}
          </Text>

          <Spacer size="xxl" />

          <Button
            title="Back to Sign In"
            onPress={handleBackToLogin}
            variant="primary"
            style={styles.button}
          />
        </View>
      </Container>
    );
  }

  return (
    <Container style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Reset Password</Text>

        <Spacer size="md" />

        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Enter your email address and we'll send you a link to reset your password
        </Text>

        <Spacer size="xxl" />

        <TextInput
          label="Email"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (error) setError('');
          }}
          error={error}
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />

        <Spacer size="xl" />

        <Button
          title={isLoading ? 'Sending...' : 'Send Reset Link'}
          onPress={handleResetPassword}
          variant="primary"
          disabled={isLoading}
          style={styles.button}
        />

        <Spacer size="lg" />

        <Button title="Back to Sign In" onPress={handleBackToLogin} variant="text" />
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 80,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    width: '100%',
  },
  successIcon: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconText: {
    fontSize: 48,
  },
});
