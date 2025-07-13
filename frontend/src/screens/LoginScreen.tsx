import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image, Animated, Dimensions } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Container, Spacer } from '@/components/layout';
import { Button } from '@/components/base/Button';
import { GradientButton } from '@/components/base/GradientButton';
import { TextInput } from '@/components/base/TextInput';
import { LoadingOverlay } from '@/components/base/Loading';
import { SocialLoginButton } from '@/components/auth/SocialLoginButton';
import { AnimatedGradientBackground } from '@/components/base/AnimatedGradientBackground';
import { GlassCard } from '@/components/base/GlassCard';
import { IconButton } from '@/components/base/IconButton';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { AuthStackParamList } from '@/navigation/types';
import { validateEmail, validateRequired } from '@/utils/validation';
import { APP_CONFIG, ERROR_MESSAGES, LOADING_MESSAGES } from '@/constants';
import { enableSocialAuth } from '@/config/env';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from 'react-native';
import { rs, moderateScale, fontScale } from '@/utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { height: screenHeight } = Dimensions.get('window');

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

  const logoScale = useRef(new Animated.Value(1)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  
  React.useEffect(() => {
    // Logo animation
    Animated.sequence([
      Animated.timing(logoScale, {
        toValue: 0.9,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Form fade in
    Animated.timing(formOpacity, {
      toValue: 1,
      duration: 800,
      delay: 300,
      useNativeDriver: true,
    }).start();
  }, []);

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

  return (
    <View style={{ flex: 1 }}>
      {/* Full-screen animated gradient */}
      <AnimatedGradientBackground 
        type="aurora" 
        animated={true} 
        speed="slow"
      />
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Container style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Glassmorphic header card */}
            <GlassCard
              style={styles.header}
              animated={true}
              animationDelay={0}
              intensity={100}
              glassBorder={true}
            >
              <Animated.View style={{ transform: [{ scale: logoScale }] }}>
                <Image 
                  source={require('../../assets/logo_cropped.png')} 
                  style={styles.headerLogo}
                  resizeMode="contain"
                />
              </Animated.View>
              <Spacer size="md" />
              <Text style={[styles.title, { color: theme.colors.text.primary }]}>Welcome Back</Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                Sign in to continue your nutrition journey
              </Text>
            </GlassCard>

            <Spacer size="xxl" />

            <Animated.View style={[styles.form, { opacity: formOpacity }]}>
              <GlassCard style={styles.inputCard} intensity={80}>
                <View style={styles.inputContainer}>
                  <Ionicons 
                    name="mail-outline" 
                    size={moderateScale(20)} 
                    color={theme.colors.primary[500]} 
                    style={styles.inputIcon}
                  />
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
                    style={styles.input}
                  />
                </View>
              </GlassCard>

              <Spacer size="md" />

              <GlassCard style={styles.inputCard} intensity={80}>
                <View style={styles.inputContainer}>
                  <Ionicons 
                    name="lock-closed-outline" 
                    size={moderateScale(20)} 
                    color={theme.colors.primary[500]} 
                    style={styles.inputIcon}
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
                    style={styles.input}
                  />
                </View>
              </GlassCard>

              <Spacer size="md" />

              <Button onPress={handleForgotPassword} variant="text" style={styles.forgotButton}>
                <Text style={[styles.forgotText, { color: theme.colors.primary[400] }]}>
                  Forgot Password?
                </Text>
              </Button>

              <Spacer size="xl" />

              <GradientButton
                onPress={handleLogin}
                variant="primary"
                size="large"
                fullWidth
                loading={isLoading}
                icon={<Ionicons name="log-in-outline" size={moderateScale(24)} color="#FFFFFF" />}
                iconPosition="right"
                style={styles.loginButton}
              >
                {isLoading ? LOADING_MESSAGES.LOGGING_IN : 'Sign In'}
              </GradientButton>

            {enableSocialAuth && (
              <>
                  <Spacer size="lg" />

                  <View style={styles.divider}>
                    <View style={[styles.dividerLine, { backgroundColor: theme.colors.border + '50' }]} />
                    <GlassCard style={styles.dividerTextContainer} intensity={60}>
                      <Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>or</Text>
                    </GlassCard>
                    <View style={[styles.dividerLine, { backgroundColor: theme.colors.border + '50' }]} />
                  </View>

                  <Spacer size="lg" />

                  <GlassCard style={styles.socialCard} intensity={80}>
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
                  </GlassCard>
              </>
            )}

              <Spacer size="md" />

              <GradientButton
                onPress={handleRegister}
                variant="secondary"
                size="large"
                fullWidth
                icon={<Ionicons name="person-add-outline" size={moderateScale(22)} color="#FFFFFF" />}
                style={styles.registerButton}
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
            </Animated.View>
          </ScrollView>

          {isLoading && <LoadingOverlay visible={true} message={LOADING_MESSAGES.LOGGING_IN} />}
        </Container>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: rs.large,
    paddingTop: moderateScale(60),
    paddingBottom: moderateScale(40),
    minHeight: screenHeight,
  },
  header: {
    alignItems: 'center',
    padding: rs.xlarge,
    marginBottom: rs.large,
  },
  headerLogo: {
    width: moderateScale(80),
    height: moderateScale(80),
    marginBottom: rs.small,
  },
  title: {
    fontSize: fontScale(32),
    fontWeight: 'bold',
    marginBottom: rs.small,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontScale(16),
    textAlign: 'center',
    lineHeight: fontScale(24),
    opacity: 0.8,
  },
  form: {
    flex: 1,
  },
  inputCard: {
    padding: 0,
    overflow: 'hidden',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs.medium,
  },
  inputIcon: {
    marginRight: rs.medium,
  },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? rs.medium : rs.small,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    paddingVertical: rs.small,
  },
  forgotText: {
    fontSize: fontScale(14),
    fontWeight: '500',
  },
  loginButton: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  registerButton: {
    elevation: 2,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: rs.small,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerTextContainer: {
    paddingHorizontal: rs.large,
    paddingVertical: rs.small,
    marginHorizontal: rs.medium,
  },
  dividerText: {
    fontSize: fontScale(14),
    fontWeight: '500',
  },
  socialCard: {
    padding: rs.small,
  },
  demoButton: {
    alignSelf: 'center',
    paddingVertical: rs.medium,
    paddingHorizontal: rs.large,
  },
  demoButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  demoIcon: {
    marginRight: rs.small,
  },
  demoButtonText: {
    fontSize: fontScale(16),
    fontWeight: '600',
  },
});
