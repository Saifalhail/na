import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Container, Spacer } from '@/components/layout';
import { Button } from '@/components/base/Button';
import { TextInput } from '@/components/base/TextInput';
import { Card } from '@/components/base/Card';
import { LoadingOverlay } from '@/components/base/Loading';
import { useTheme } from '@/hooks/useTheme';
import { useTwoFactorStore } from '@/store/twoFactorStore';
import { AuthStackParamList } from '@/navigation/types';

type TwoFactorVerifyScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  'TwoFactorVerify'
>;
type TwoFactorVerifyScreenRouteProp = RouteProp<AuthStackParamList, 'TwoFactorVerify'>;

interface Props {
  navigation: TwoFactorVerifyScreenNavigationProp;
  route: TwoFactorVerifyScreenRouteProp;
}

export const TwoFactorVerifyScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { verifySetup, generateBackupCodes, isLoading, error } = useTwoFactorStore();
  const [verificationCode, setVerificationCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const inputRef = useRef<any>(null);

  useEffect(() => {
    // Focus the input when component mounts
    setTimeout(() => {
      inputRef.current?.focus();
    }, 500);
  }, []);

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      setCodeError('Please enter the verification code');
      return;
    }

    if (verificationCode.length !== 6) {
      setCodeError('Verification code must be 6 digits');
      return;
    }

    try {
      const result = await verifySetup(verificationCode.trim());
      if (result.success) {
        setIsVerified(true);
        // Generate backup codes after successful verification
        const codes = await generateBackupCodes();
        setBackupCodes(codes);
      } else {
        setCodeError('Invalid verification code. Please try again.');
      }
    } catch (err: any) {
      setCodeError(err.message || 'Verification failed. Please try again.');
    }
  };

  const handleComplete = () => {
    Alert.alert(
      'Two-Factor Authentication Enabled',
      'Your account is now more secure with 2FA enabled.',
      [
        {
          text: 'Continue',
          onPress: () => {
            // Navigate back to profile or wherever appropriate
            navigation.navigate('Profile');
          },
        },
      ]
    );
  };

  const handleBackupCodesSaved = () => {
    Alert.alert(
      'Backup Codes Saved',
      'Make sure you have saved these backup codes in a secure location.',
      [{ text: 'I have saved them', onPress: handleComplete }]
    );
  };

  if (isLoading) {
    return <LoadingOverlay visible={true} message="Verifying code..." />;
  }

  if (isVerified && backupCodes.length > 0) {
    return (
      <Container padding="large">
        <Text style={[styles.title, { color: theme.colors.text }]}>Save Your Backup Codes</Text>

        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Store these codes in a safe place. You can use them to access your account if you lose
          your authenticator device.
        </Text>

        <Spacer size="xl" />

        <Card style={styles.backupCodesCard}>
          <Text style={[styles.backupCodesTitle, { color: theme.colors.text }]}>Backup Codes</Text>
          <Text style={[styles.backupCodesSubtitle, { color: theme.colors.textSecondary }]}>
            Each code can only be used once
          </Text>

          <Spacer size="md" />

          <View style={styles.codesGrid}>
            {backupCodes.map((code, index) => (
              <Text
                key={index}
                style={[
                  styles.backupCode,
                  { color: theme.colors.text, backgroundColor: theme.colors.neutral[100] },
                ]}
              >
                {code}
              </Text>
            ))}
          </View>
        </Card>

        <Spacer size="xl" />

        <Button onPress={handleBackupCodesSaved} variant="primary" style={styles.completeButton}>
          I have saved my backup codes
        </Button>
      </Container>
    );
  }

  return (
    <Container padding="large">
      <Text style={[styles.title, { color: theme.colors.text }]}>Verify Your Setup</Text>

      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Enter the 6-digit code from your authenticator app
      </Text>

      <Spacer size="xl" />

      <Card style={styles.verificationCard}>
        <TextInput
          ref={inputRef}
          label="Verification Code"
          value={verificationCode}
          onChangeText={(text) => {
            setVerificationCode(text.replace(/[^0-9]/g, ''));
            if (codeError) setCodeError('');
          }}
          error={codeError}
          placeholder="000000"
          keyboardType="numeric"
          maxLength={6}
          autoFocus
          style={styles.codeInput}
        />

        <Spacer size="md" />

        <Text style={[styles.codeHint, { color: theme.colors.textSecondary }]}>
          Open your authenticator app and enter the 6-digit code for Nutrition AI
        </Text>
      </Card>

      <Spacer size="xl" />

      <View style={styles.buttonContainer}>
        <Button
          onPress={handleVerifyCode}
          variant="primary"
          disabled={verificationCode.length !== 6}
          style={styles.verifyButton}
        >
          Verify Code
        </Button>

        <Spacer size="md" />

        <Button onPress={() => navigation.goBack()} variant="outline" style={styles.backButton}>
          Back to QR Code
        </Button>
      </View>

      {error && (
        <>
          <Spacer size="md" />
          <Text style={[styles.error, { color: theme.colors.error[500] }]}>{error}</Text>
        </>
      )}
    </Container>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  verificationCard: {
    padding: 20,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 4,
  },
  codeHint: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
  },
  verifyButton: {
    width: '100%',
  },
  backButton: {
    width: '100%',
  },
  backupCodesCard: {
    padding: 20,
  },
  backupCodesTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  backupCodesSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  codesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  backupCode: {
    width: '48%',
    padding: 12,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'monospace',
    fontSize: 16,
    borderRadius: 4,
  },
  completeButton: {
    width: '100%',
  },
  error: {
    fontSize: 14,
    textAlign: 'center',
  },
});
