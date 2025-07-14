import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@/components/IconFallback';
import { Card } from '@/components/base/Card';
import { Switch } from '@/components/base/Switch';
import { Button } from '@/components/base/Button';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';
import { useAuthStore } from '@/store/authStore';
import { spacing, layout } from '@/theme/spacing';
import { textPresets } from '@/theme/typography';
import { getModernShadow } from '@/theme/shadows';
import { MainStackParamList } from '@/navigation/types';
import * as Haptics from 'expo-haptics';

type SettingsScreenNavigationProp = StackNavigationProp<MainStackParamList, 'Settings'>;

interface Props {
  navigation: SettingsScreenNavigationProp;
}

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { theme, themeMode, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          logout();
          navigation.reset({
            index: 0,
            routes: [{ name: 'Auth' as any }],
          });
        },
      },
    ]);
  };

  const handlePress = async (action?: () => void) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action?.();
  };

  const SettingItem: React.FC<{
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showSwitch?: boolean;
    switchValue?: boolean;
    onSwitchToggle?: (value: boolean) => void;
    showChevron?: boolean;
    isLast?: boolean;
  }> = ({
    icon,
    title,
    subtitle,
    onPress,
    showSwitch,
    switchValue,
    onSwitchToggle,
    showChevron = true,
    isLast = false,
  }) => {
    const styles = createStyles(theme);
    
    return (
      <TouchableOpacity
        style={[styles.settingItem, isLast && styles.lastSettingItem]}
        onPress={() => handlePress(onPress)}
        disabled={!onPress && !showSwitch}
        activeOpacity={0.7}
      >
        <View style={styles.settingLeft}>
          <View style={styles.settingIconContainer}>
            <Ionicons
              name={icon as any}
              size={24}
              color={theme.colors.primary[500]}
            />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>{title}</Text>
            {subtitle && (
              <Text style={styles.settingSubtitle}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.settingRight}>
          {showSwitch && <Switch value={switchValue} onValueChange={onSwitchToggle} />}
          {showChevron && !showSwitch && (
            <Ionicons name="chevron-forward" size={20} color={theme.colors.text.secondary} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const styles = createStyles(theme);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="arrow-back" 
            size={24} 
            color={theme.colors.text.primary} 
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance */}
        <Card variant="elevated" padding="none" style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <SettingItem
            icon="moon-outline"
            title="Dark Mode"
            subtitle="Toggle between light and dark themes"
            showSwitch
            switchValue={themeMode === 'dark'}
            onSwitchToggle={toggleTheme}
            showChevron={false}
            isLast
          />
        </Card>

        {/* Notifications */}
        <Card variant="elevated" padding="none" style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <SettingItem
            icon="notifications-outline"
            title="Push Notifications"
            subtitle="Meal reminders and tips"
            showSwitch
            switchValue={true}
            onSwitchToggle={() => {}}
            showChevron={false}
          />
          <SettingItem
            icon="mail-outline"
            title="Email Notifications"
            subtitle="Weekly progress reports"
            showSwitch
            switchValue={false}
            onSwitchToggle={() => {}}
            showChevron={false}
            isLast
          />
        </Card>

        {/* Privacy & Security */}
        <Card variant="elevated" padding="none" style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Security</Text>
          <SettingItem 
            icon="shield-outline" 
            title="Privacy Policy" 
            onPress={() => {}} 
          />
          <SettingItem 
            icon="document-text-outline" 
            title="Terms of Service" 
            onPress={() => {}} 
          />
          <SettingItem 
            icon="lock-closed-outline" 
            title="Data & Privacy" 
            onPress={() => {}} 
            isLast
          />
        </Card>

        {/* Support */}
        <Card variant="elevated" padding="none" style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <SettingItem 
            icon="help-circle-outline" 
            title="Help Center" 
            onPress={() => {}} 
          />
          <SettingItem 
            icon="chatbubble-outline" 
            title="Contact Support" 
            onPress={() => {}} 
          />
          <SettingItem 
            icon="star-outline" 
            title="Rate App" 
            onPress={() => {}} 
            isLast
          />
        </Card>

        {/* Account */}
        <Card variant="elevated" padding="none" style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <SettingItem
            icon="log-out-outline"
            title="Sign Out"
            onPress={handleLogout}
            showChevron={false}
            isLast
          />
        </Card>
      </ScrollView>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: layout.screenPadding,
      paddingVertical: spacing['4'], // 16px
      borderBottomWidth: layout.borderWidth.thin,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
    backButton: {
      width: layout.minTouchTarget,
      height: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: -spacing['3'], // -12px for better alignment
      borderRadius: layout.minTouchTarget / 2,
    },
    headerTitle: {
      ...textPresets.h3,
      color: theme.colors.text.primary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    headerSpacer: {
      width: layout.minTouchTarget - spacing['3'], // Match back button space
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: layout.screenPadding,
      paddingTop: spacing['6'], // 24px
      paddingBottom: spacing['24'], // 96px for bottom tab
      gap: spacing['4'], // 16px between cards
    },
    section: {
      marginBottom: spacing['4'], // 16px
      overflow: 'hidden',
    },
    sectionTitle: {
      ...textPresets.body,
      color: theme.colors.text.primary,
      fontWeight: theme.typography.fontWeight.semibold,
      paddingHorizontal: spacing['4'], // 16px
      paddingTop: spacing['4'], // 16px
      paddingBottom: spacing['3'], // 12px
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing['4'], // 16px
      paddingVertical: spacing['3.5'], // 14px
      minHeight: spacing['14'], // 56px
      borderBottomWidth: layout.borderWidth.thin,
      borderBottomColor: theme.colors.border,
      backgroundColor: 'transparent',
    },
    lastSettingItem: {
      borderBottomWidth: 0,
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: spacing['3'], // 12px
    },
    settingIconContainer: {
      width: spacing['10'], // 40px
      height: spacing['10'], // 40px
      borderRadius: spacing['5'], // 20px
      backgroundColor: theme.isDark ? theme.colors.neutral[200] : theme.colors.neutral[50],
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingContent: {
      flex: 1,
    },
    settingTitle: {
      ...textPresets.body,
      color: theme.colors.text.primary,
      fontWeight: theme.typography.fontWeight.medium,
      marginBottom: spacing['0.5'], // 2px
    },
    settingSubtitle: {
      ...textPresets.caption,
      color: theme.colors.text.secondary,
    },
    settingRight: {
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: spacing['3'], // 12px
    },
  });