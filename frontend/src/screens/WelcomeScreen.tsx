import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Container, Spacer } from '@/components/layout';
import { Button } from '@/components/base/Button';

import { useTheme } from '@/hooks/useTheme';
import { AuthStackParamList } from '@/navigation/types';
import { APP_CONFIG } from '@/constants';
import { rs } from '@/utils/responsive';

type WelcomeScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Welcome'>;

interface Props {
  navigation: WelcomeScreenNavigationProp;
}

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <Container style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {/* Bite Sight Logo */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Spacer size="xl" />

        <Text style={[styles.title, { color: theme.colors.text.primary }]}>{APP_CONFIG.NAME}</Text>

        <Spacer size="md" />

        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {APP_CONFIG.DESCRIPTION}
        </Text>

        <Spacer size="xxl" />

        <View style={styles.features}>
          <FeatureItem
            icon="📸"
            title="AI-Powered Analysis"
            description="Instantly analyze your meals with advanced AI"
            theme={theme}
          />

          <Spacer size="lg" />

          <FeatureItem
            icon="📊"
            title="Detailed Nutrition"
            description="Get complete nutritional breakdown"
            theme={theme}
          />

          <Spacer size="lg" />

          <FeatureItem
            icon="📈"
            title="Track Progress"
            description="Monitor your health journey over time"
            theme={theme}
          />
        </View>

        <Spacer size="xxl" />
      </View>

      <View style={styles.buttons}>
        <Button
          onPress={handleRegister}
          variant="primary"
          style={styles.primaryButton}
        >
          Get Started
        </Button>

        <Spacer size="md" />

        <Button onPress={handleLogin} variant="text">
          Already have an account? Sign In
        </Button>
      </View>
    </Container>
  );
};

interface FeatureItemProps {
  icon: string;
  title: string;
  description: string;
  theme: any;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, title, description, theme }) => (
  <View style={styles.featureItem}>
    <View style={styles.featureIcon}>
      <Text style={styles.featureIconText}>{icon}</Text>
    </View>
    <View style={styles.featureContent}>
      <Text style={[styles.featureTitle, { color: theme.colors.text }]}>{title}</Text>
      <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>
        {description}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 80,
  },
  logoContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  features: {
    width: '100%',
    paddingHorizontal: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureIconText: {
    fontSize: 24,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  buttons: {
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  primaryButton: {
    width: '100%',
  },
});
