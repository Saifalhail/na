import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Clipboard } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import QRCode from 'react-native-qrcode-svg';
import { Container, Spacer } from '@/components/layout';
import { Button } from '@/components/base/Button';
import { Card } from '@/components/base/Card';
import { LoadingOverlay } from '@/components/base/Loading';
import { useTheme } from '@/hooks/useTheme';
import { useTwoFactorStore } from '@/store/twoFactorStore';
import { AuthStackParamList } from '@/navigation/types';

type TwoFactorSetupScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'TwoFactorSetup'>;

interface Props {
  navigation: TwoFactorSetupScreenNavigationProp;
}

export const TwoFactorSetupScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { setupData, getQRCode, isLoading, error } = useTwoFactorStore();
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    // Initialize 2FA setup when component mounts
    if (!setupData) {
      handleGetQRCode();
    }
  }, [setupData]);

  const handleGetQRCode = async () => {
    try {
      await getQRCode();
    } catch (error) {
      console.error('Failed to get QR code:', error);
    }
  };

  const handleContinue = () => {
    if (setupData) {
      navigation.navigate('TwoFactorVerify', { secret: setupData.secret || '' });
    }
  };

  const handleCopySecretKey = async () => {
    if (setupData?.manual_entry_key) {
      await Clipboard.setString(setupData.manual_entry_key);
      Alert.alert('Copied!', 'The secret key has been copied to your clipboard.');
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Two-Factor Authentication?',
      'You can set this up later in your profile settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', style: 'destructive', onPress: () => navigation.goBack() },
      ]
    );
  };

  if (isLoading) {
    return <LoadingOverlay visible={true} message="Setting up Two-Factor Authentication..." />;
  }

  if (error) {
    return (
      <Container>
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>Setup Failed</Text>
        <Text style={[styles.error, { color: theme.colors.error[500] }]}>{error}</Text>
        <Spacer size="lg" />
        <Button onPress={handleGetQRCode} variant="primary">
          Try Again
        </Button>
      </Container>
    );
  }

  return (
    <Container padding="large">
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>
        Set up Two-Factor Authentication
      </Text>

      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Add an extra layer of security to your account
      </Text>

      <Spacer size="xl" />

      <Card style={styles.card}>
        <Text style={[styles.stepNumber, { color: theme.colors.primary[500] }]}>Step 1</Text>
        <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>
          Install an Authenticator App
        </Text>
        <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
          Download and install an authenticator app like Google Authenticator, Authy, or Microsoft
          Authenticator.
        </Text>
      </Card>

      <Spacer size="lg" />

      <Card style={styles.card}>
        <Text style={[styles.stepNumber, { color: theme.colors.primary[500] }]}>Step 2</Text>
        <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>Scan QR Code</Text>

        {setupData?.qr_code ? (
          <View style={styles.qrContainer}>
            <QRCode
              value={setupData.qr_code}
              size={200}
              color={theme.colors.text.primary}
              backgroundColor={theme.colors.background}
              logo={undefined}
              logoSize={0}
            />

            <Spacer size="md" />

            <Text style={[styles.manualEntry, { color: theme.colors.textSecondary }]}>
              Can't scan? Enter this code manually:
            </Text>
            <TouchableOpacity
              style={[styles.secretKeyContainer, { backgroundColor: theme.colors.neutral[100] }]}
              onPress={handleCopySecretKey}
            >
              <Text style={[styles.secretKey, { color: theme.colors.text.primary }]}>
                {setupData.manual_entry_key}
              </Text>
              <Text style={[styles.copyHint, { color: theme.colors.textSecondary }]}>
                Tap to copy
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
            Generating QR code...
          </Text>
        )}
      </Card>

      <Spacer size="xl" />

      <View style={styles.buttonContainer}>
        <Button
          onPress={handleContinue}
          variant="primary"
          disabled={!setupData}
          style={styles.continueButton}
        >
          Continue to Verification
        </Button>

        <Spacer size="md" />

        <Button onPress={handleSkip} variant="text" style={styles.skipButton}>
          Skip for now
        </Button>
      </View>
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
  error: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  card: {
    padding: 20,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  qrContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  manualEntry: {
    fontSize: 12,
    textAlign: 'center',
  },
  secretKeyContainer: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  secretKey: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  copyHint: {
    fontSize: 12,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
  },
  continueButton: {
    width: '100%',
  },
  skipButton: {
    alignSelf: 'center',
  },
});
