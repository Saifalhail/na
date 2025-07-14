import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@/components/IconFallback';
import { Card } from '@/components/base/Card';
import { Switch } from '@/components/base/Switch';
import { Button } from '@/components/base/Button';
import { Avatar } from '@/components/base/Avatar';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';
import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/userStore';
import { spacing, layout } from '@/theme/spacing';
import { textPresets } from '@/theme/typography';
import { getModernShadow } from '@/theme/shadows';
import { MainStackParamList } from '@/navigation/types';
import * as Haptics from 'expo-haptics';

const { width: screenWidth } = Dimensions.get('window');

type SettingsScreenNavigationProp = StackNavigationProp<MainStackParamList, 'Settings'>;

interface Props {
  navigation: SettingsScreenNavigationProp;
}

// Reusable Modern Setting Item Component
const ModernSettingItem: React.FC<{
  icon: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showSwitch?: boolean;
  switchValue?: boolean;
  onSwitchToggle?: (value: boolean) => void;
  showChevron?: boolean;
  badge?: string;
  badgeColor?: string;
  theme: Theme;
}> = ({
  icon,
  iconColor,
  title,
  subtitle,
  onPress,
  showSwitch,
  switchValue,
  onSwitchToggle,
  showChevron = true,
  badge,
  badgeColor,
  theme,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 40,
      friction: 3,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 20,
      friction: 3,
    }).start();
  };
  
  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };
  
  const styles = createSettingItemStyles(theme);
  
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.container}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!onPress && !showSwitch}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={theme.isDark
            ? ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.01)']
            : ['rgba(0,0,0,0.01)', 'rgba(0,0,0,0.02)']
          }
          style={styles.gradient}
        >
          <View style={styles.content}>
            <View style={styles.leftContent}>
              <View style={[
                styles.iconContainer,
                iconColor && { backgroundColor: iconColor + '15' }
              ]}>
                <Ionicons
                  name={icon as any}
                  size={24}
                  color={iconColor || theme.colors.primary[500]}
                />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.title}>{title}</Text>
                {subtitle && (
                  <Text style={styles.subtitle}>{subtitle}</Text>
                )}
              </View>
            </View>
            
            <View style={styles.rightContent}>
              {badge && (
                <View style={[
                  styles.badge,
                  badgeColor && { backgroundColor: badgeColor }
                ]}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              )}
              {showSwitch && (
                <Switch
                  value={switchValue}
                  onValueChange={onSwitchToggle}
                  trackColor={{ 
                    false: theme.colors.neutral[200], 
                    true: theme.colors.primary[500] 
                  }}
                  thumbColor={theme.colors.white}
                />
              )}
              {showChevron && !showSwitch && (
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.text.secondary}
                />
              )}
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Reusable Section Component
const SettingsSection: React.FC<{
  title: string;
  icon?: string;
  children: React.ReactNode;
  theme: Theme;
}> = ({ title, icon, children, theme }) => {
  const styles = createSectionStyles(theme);
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {icon && (
          <Ionicons
            name={icon as any}
            size={20}
            color={theme.colors.text.secondary}
            style={styles.icon}
          />
        )}
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { theme, themeMode, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();
  const { profile } = useUserStore();
  
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  
  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          logout();
          navigation.reset({
            index: 0,
            routes: [{ name: 'Auth' as any }],
          });
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Handle account deletion
            if (__DEV__) {
              console.log('🗑️ [SETTINGS] Account deletion requested');
            }
          },
        },
      ]
    );
  };

  const styles = createStyles(theme);
  
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={theme.isDark
          ? ['#1a1f36', '#0f1419', '#000000']
          : ['#f5f7ff', '#eef2ff', '#ffffff']
        }
        style={styles.backgroundGradient}
      />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <BlurView intensity={20} style={styles.backButtonBlur}>
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.text.primary}
            />
          </BlurView>
        </TouchableOpacity>
        
        <Animated.View style={[styles.headerTitleContainer, { opacity: headerOpacity }]}>
          <Text style={styles.headerTitle}>Settings</Text>
        </Animated.View>
        
        <View style={styles.headerSpacer} />
      </View>

      <Animated.ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Profile Section */}
        <TouchableOpacity
          style={styles.profileSection}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[theme.colors.primary[500], theme.colors.secondary[500]]}
            style={styles.profileGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.profileContent}>
              <Avatar
                name={user?.first_name || 'User'}
                size="large"
                style={styles.profileAvatar}
              />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {user?.first_name} {user?.last_name}
                </Text>
                <Text style={styles.profileEmail}>{user?.email}</Text>
                <View style={styles.profileBadge}>
                  <Text style={styles.profileBadgeText}>
                    {profile?.accountType === 'premium' ? 'Premium' : 'Free'}
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={24}
                color="white"
              />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Appearance Section */}
        <SettingsSection title="Appearance" icon="color-palette-outline" theme={theme}>
          <ModernSettingItem
            icon="moon-outline"
            iconColor={theme.colors.secondary[500]}
            title="Dark Mode"
            subtitle="Reduce eye strain in low light"
            showSwitch
            switchValue={themeMode === 'dark'}
            onSwitchToggle={toggleTheme}
            showChevron={false}
            theme={theme}
          />
        </SettingsSection>

        {/* Notifications Section */}
        <SettingsSection title="Notifications" icon="notifications-outline" theme={theme}>
          <ModernSettingItem
            icon="notifications-outline"
            iconColor={theme.colors.primary[500]}
            title="Push Notifications"
            subtitle="Meal reminders and daily tips"
            showSwitch
            switchValue={pushNotifications}
            onSwitchToggle={setPushNotifications}
            showChevron={false}
            theme={theme}
          />
          <ModernSettingItem
            icon="mail-outline"
            iconColor={theme.colors.info[500]}
            title="Email Notifications"
            subtitle="Weekly progress reports"
            showSwitch
            switchValue={emailNotifications}
            onSwitchToggle={setEmailNotifications}
            showChevron={false}
            theme={theme}
          />
        </SettingsSection>

        {/* Privacy & Security Section */}
        <SettingsSection title="Privacy & Security" icon="shield-outline" theme={theme}>
          <ModernSettingItem
            icon="shield-checkmark-outline"
            iconColor={theme.colors.success[500]}
            title="Privacy Policy"
            onPress={() => {
              if (__DEV__) console.log('📄 [SETTINGS] Privacy Policy pressed');
            }}
            theme={theme}
          />
          <ModernSettingItem
            icon="document-text-outline"
            iconColor={theme.colors.warning[500]}
            title="Terms of Service"
            onPress={() => {
              if (__DEV__) console.log('📄 [SETTINGS] Terms of Service pressed');
            }}
            theme={theme}
          />
          <ModernSettingItem
            icon="key-outline"
            iconColor={theme.colors.secondary[500]}
            title="Change Password"
            onPress={() => {
              if (__DEV__) console.log('🔑 [SETTINGS] Change Password pressed');
            }}
            theme={theme}
          />
          <ModernSettingItem
            icon="lock-closed-outline"
            iconColor={theme.colors.primary[500]}
            title="Two-Factor Authentication"
            subtitle="Not enabled"
            badge="Setup"
            badgeColor={theme.colors.warning[500]}
            onPress={() => navigation.navigate('TwoFactorSetup')}
            theme={theme}
          />
        </SettingsSection>

        {/* Support Section */}
        <SettingsSection title="Support" icon="help-circle-outline" theme={theme}>
          <ModernSettingItem
            icon="help-circle-outline"
            iconColor={theme.colors.info[500]}
            title="Help Center"
            subtitle="FAQs and guides"
            onPress={() => {
              if (__DEV__) console.log('❓ [SETTINGS] Help Center pressed');
            }}
            theme={theme}
          />
          <ModernSettingItem
            icon="chatbubbles-outline"
            iconColor={theme.colors.primary[500]}
            title="Contact Support"
            subtitle="Get help from our team"
            onPress={() => {
              if (__DEV__) console.log('💬 [SETTINGS] Contact Support pressed');
            }}
            theme={theme}
          />
          <ModernSettingItem
            icon="star-outline"
            iconColor={theme.colors.warning[500]}
            title="Rate App"
            subtitle="Share your feedback"
            onPress={() => {
              if (__DEV__) console.log('⭐ [SETTINGS] Rate App pressed');
            }}
            theme={theme}
          />
        </SettingsSection>

        {/* About Section */}
        <SettingsSection title="About" icon="information-circle-outline" theme={theme}>
          <ModernSettingItem
            icon="logo-react"
            iconColor={theme.colors.secondary[500]}
            title="Version"
            subtitle="1.0.0 (Build 100)"
            showChevron={false}
            theme={theme}
          />
          <ModernSettingItem
            icon="code-slash-outline"
            iconColor={theme.colors.primary[500]}
            title="Open Source Libraries"
            onPress={() => {
              if (__DEV__) console.log('📚 [SETTINGS] Open Source Libraries pressed');
            }}
            theme={theme}
          />
        </SettingsSection>

        {/* Account Actions */}
        <View style={styles.accountActions}>
          <Button
            variant="outline"
            size="large"
            fullWidth
            onPress={handleLogout}
            style={styles.logoutButton}
            icon={<Ionicons name="log-out-outline" size={20} color={theme.colors.primary[500]} />}
            iconPosition="left"
          >
            Sign Out
          </Button>
          
          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={handleDeleteAccount}
          >
            <Text style={styles.deleteAccountText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
        
        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </Animated.ScrollView>
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 300,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['5'],
    paddingBottom: spacing['3'],
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  backButtonBlur: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.isDark 
      ? 'rgba(255,255,255,0.1)' 
      : 'rgba(0,0,0,0.05)',
  },
  headerTitleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  headerTitle: {
    ...textPresets.h3,
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: spacing['4'],
    paddingBottom: spacing['10'],
  },
  profileSection: {
    marginHorizontal: spacing['5'],
    marginBottom: spacing['6'],
    borderRadius: 20,
    overflow: 'hidden',
    ...getModernShadow(theme, 'medium'),
  },
  profileGradient: {
    padding: spacing['5'],
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing['4'],
  },
  profileName: {
    ...textPresets.h3,
    color: 'white',
    fontWeight: '600',
    marginBottom: 2,
  },
  profileEmail: {
    ...textPresets.body,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: spacing['2'],
  },
  profileBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['1'],
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  profileBadgeText: {
    ...textPresets.caption,
    color: 'white',
    fontWeight: '600',
  },
  accountActions: {
    marginHorizontal: spacing['5'],
    marginTop: spacing['6'],
  },
  logoutButton: {
    marginBottom: spacing['4'],
  },
  deleteAccountButton: {
    alignItems: 'center',
    padding: spacing['3'],
  },
  deleteAccountText: {
    ...textPresets.body,
    color: theme.colors.error[500],
    fontWeight: '500',
  },
});

const createSectionStyles = (theme: Theme) => StyleSheet.create({
  container: {
    marginHorizontal: spacing['5'],
    marginBottom: spacing['6'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing['3'],
  },
  icon: {
    marginRight: spacing['2'],
  },
  title: {
    ...textPresets.subtitle,
    color: theme.colors.text.secondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    gap: spacing['2'],
  },
});

const createSettingItemStyles = (theme: Theme) => StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    ...getModernShadow(theme, 'small'),
  },
  gradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.isDark 
      ? 'rgba(255,255,255,0.05)' 
      : 'rgba(0,0,0,0.05)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['4'],
    minHeight: 72,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing['3'],
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...textPresets.body,
    color: theme.colors.text.primary,
    fontWeight: '500',
    marginBottom: 2,
  },
  subtitle: {
    ...textPresets.caption,
    color: theme.colors.text.secondary,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
  },
  badge: {
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: spacing['2'],
    paddingVertical: spacing['1'],
    borderRadius: 8,
  },
  badgeText: {
    ...textPresets.caption,
    color: 'white',
    fontWeight: '600',
    fontSize: 11,
  },
});