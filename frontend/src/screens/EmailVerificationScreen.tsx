import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Container, Spacer } from '@/components/layout';
import { Button } from '@/components/base/Button';
import { TextInput } from '@/components/base/TextInput';
import { LoadingOverlay } from '@/components/base/Loading';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/api/endpoints/auth';
import { AuthStackParamList } from '@/navigation/types';
import { spacing } from '@/theme/spacing';
import { textPresets } from '@/theme/typography';
import * as Haptics from 'expo-haptics';

type EmailVerificationScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  'EmailVerification'
>;
type EmailVerificationScreenRouteProp = RouteProp<
  AuthStackParamList,
  'EmailVerification'
>;

interface Props {
  navigation: EmailVerificationScreenNavigationProp;
  route: EmailVerificationScreenRouteProp;
}

export const EmailVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { register } = useAuthStore();
  const { email, registrationData } = route.params;
  
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  
  const codeInputRefs = Array(6).fill(null).map(() => React.createRef<any>());
  
  useEffect(() => {
    // Start countdown timer
    const timer = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  useEffect(() => {
    // Auto-submit when all digits are entered
    if (code.every((digit) => digit !== '')) {
      handleVerifyCode();
    }
  }, [code]);
  
  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');
    
    // Auto-focus next input
    if (value && index < 5) {
      codeInputRefs[index + 1].current?.focus();
    }
  };
  
  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      // Focus previous input on backspace
      codeInputRefs[index - 1].current?.focus();
    }
  };
  
  const handleVerifyCode = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Verify the code
      await authApi.verifyEmailCode(email, fullCode);
      
      if (__DEV__) {
        console.log('✅ [EMAIL VERIFICATION] Code verified successfully');
      }
      
      // Register the user after successful verification
      await register(registrationData);
      
      // Navigation will be handled by auth store on successful registration
    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ [EMAIL VERIFICATION] Verification failed:', error);
      }
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      if (error.message?.includes('Invalid code')) {
        setError('Invalid verification code. Please try again.');
      } else if (error.message?.includes('expired')) {
        setError('Code has expired. Please request a new one.');
      } else {
        setError(error.message || 'Verification failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    
    setIsResending(true);
    setError('');
    
    try {
      await authApi.sendEmailCode(email);
      
      if (__DEV__) {
        console.log('📧 [EMAIL VERIFICATION] Code resent to:', email);
      }
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
      
      // Reset timer
      setResendTimer(60);
      setCode(['', '', '', '', '', '']);
      codeInputRefs[0].current?.focus();
    } catch (error: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to send verification code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };
  
  const styles = createStyles(theme);
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={theme.isDark 
          ? ['#1a1f36', '#0f1419', '#000000']
          : ['#f0f4ff', '#e6edff', '#ffffff']
        }
        style={styles.gradient}
      />
      
      <Container style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.emoji}>📧</Text>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit code to
          </Text>
          <Text style={styles.email}>{email}</Text>
        </View>
        
        <Spacer size="xl" />
        
        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={codeInputRefs[index]}
              style={[
                styles.codeInput,
                digit ? styles.codeInputFilled : {},
                error ? styles.codeInputError : {},
              ]}
              value={digit}
              onChangeText={(value) => handleCodeChange(index, value)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
              keyboardType="numeric"
              maxLength={1}
              selectTextOnFocus
              textAlign="center"
              autoFocus={index === 0}
            />
          ))}
        </View>
        
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <Spacer size="lg" />
        )}
        
        <Spacer size="xl" />
        
        <Button
          variant="primary"
          size="large"
          fullWidth
          onPress={handleVerifyCode}
          loading={isLoading}
          disabled={code.some((digit) => !digit)}
        >
          Verify & Create Account
        </Button>
        
        <Spacer size="lg" />
        
        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>
            Didn't receive the code?{' '}
          </Text>
          <TouchableOpacity
            onPress={handleResendCode}
            disabled={resendTimer > 0 || isResending}
          >
            <Text style={[
              styles.resendLink,
              (resendTimer > 0 || isResending) && styles.resendLinkDisabled
            ]}>
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <Spacer size="xl" />
        
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>← Back to Registration</Text>
        </TouchableOpacity>
      </Container>
      
      <LoadingOverlay visible={isLoading} />
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing['5'],
  },
  header: {
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: spacing['4'],
  },
  title: {
    ...textPresets.h2,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing['2'],
  },
  subtitle: {
    ...textPresets.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  email: {
    ...textPresets.body,
    color: theme.colors.primary[500],
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing['1'],
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing['2'],
  },
  codeInput: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    ...textPresets.h2,
    color: theme.colors.text.primary,
  },
  codeInputFilled: {
    borderColor: theme.colors.primary[500],
  },
  codeInputError: {
    borderColor: theme.colors.error[500],
  },
  errorText: {
    ...textPresets.caption,
    color: theme.colors.error[500],
    textAlign: 'center',
    marginTop: spacing['2'],
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    ...textPresets.body,
    color: theme.colors.text.secondary,
  },
  resendLink: {
    ...textPresets.body,
    color: theme.colors.primary[500],
    fontWeight: '600',
  },
  resendLinkDisabled: {
    color: theme.colors.text.secondary,
  },
  backLink: {
    ...textPresets.body,
    color: theme.colors.primary[500],
    textAlign: 'center',
  },
});