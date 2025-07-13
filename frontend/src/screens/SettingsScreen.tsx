import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaContainer, Container, Spacer } from '@/components/layout';
import { Card } from '@/components/base/Card';
import { Switch } from '@/components/base/Switch';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { rs, rTouchTarget, fontScale } from '@/utils/responsive';
import { MainStackParamList } from '@/navigation/types';

type SettingsScreenNavigationProp = StackNavigationProp<MainStackParamList, 'Settings'>;

interface Props {
  navigation: SettingsScreenNavigationProp;
}

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { theme, themeMode, toggleTheme } = useTheme();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Auth' }],
            });
          },
        },
      ]
    );
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
  }> = ({
    icon,
    title,
    subtitle,
    onPress,
    showSwitch,
    switchValue,
    onSwitchToggle,
    showChevron = true,
  }) => (
    <TouchableOpacity
      style={[styles.settingItem, { borderBottomColor: theme.colors.border }]}
      onPress={onPress}
      disabled={!onPress && !showSwitch}
    >
      <View style={styles.settingLeft}>
        <Ionicons
          name={icon as any}
          size={24}
          color={theme.colors.primary[500]}
          style={styles.settingIcon}
        />
        <View style={styles.settingContent}>
          <Text style={[styles.settingTitle, { color: theme.colors.text.primary }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.settingSubtitle, { color: theme.colors.text.secondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.settingRight}>
        {showSwitch && (
          <Switch value={switchValue} onValueChange={onSwitchToggle} />
        )}
        {showChevron && !showSwitch && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.colors.text.secondary}
          />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaContainer>
      <Container style={styles.container}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { 
              backgroundColor: theme.colors.primary[500],
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }]}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
            Settings
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Spacer size="md" />

          {/* Appearance */}
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Appearance
            </Text>
            <SettingItem
              icon="moon-outline"
              title="Dark Mode"
              subtitle="Toggle between light and dark themes"
              showSwitch
              switchValue={themeMode === 'dark'}
              onSwitchToggle={toggleTheme}
              showChevron={false}
            />
          </Card>

          <Spacer size="lg" />

          {/* Notifications */}
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Notifications
            </Text>
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
            />
          </Card>

          <Spacer size="lg" />

          {/* Privacy & Security */}
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Privacy & Security
            </Text>
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
            />
          </Card>

          <Spacer size="lg" />

          {/* Support */}
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Support
            </Text>
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
            />
          </Card>

          <Spacer size="lg" />

          {/* Account */}
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Account
            </Text>
            <SettingItem
              icon="log-out-outline"
              title="Sign Out"
              onPress={handleLogout}
              showChevron={false}
            />
          </Card>

          <Spacer size="xxl" />
        </ScrollView>
      </Container>
    </SafeAreaContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rs.medium,
    paddingVertical: rs.medium,
    borderBottomWidth: 1,
  },
  backButton: {
    width: rTouchTarget.minimum,
    height: rTouchTarget.minimum,
    borderRadius: rTouchTarget.minimum / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontScale(20),
    fontWeight: '600',
  },
  headerSpacer: {
    width: rTouchTarget.minimum,
  },
  content: {
    flex: 1,
    paddingHorizontal: rs.medium,
  },
  section: {
    padding: 0,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: fontScale(16),
    fontWeight: '600',
    paddingHorizontal: rs.medium,
    paddingVertical: rs.medium,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rs.medium,
    paddingVertical: rs.medium,
    minHeight: rTouchTarget.large,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: rs.medium,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: fontScale(16),
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: fontScale(14),
    marginTop: rs.tiny,
  },
  settingRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});