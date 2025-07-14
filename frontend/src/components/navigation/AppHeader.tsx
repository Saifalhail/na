import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { HeaderLogo } from '@/components/base/HeaderLogo';
import { Avatar } from '@/components/base/Avatar';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';
import { useAuthStore } from '@/store/authStore';
import { spacing, layout } from '@/theme/spacing';
import { textPresets } from '@/theme/typography';
import * as Haptics from 'expo-haptics';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  showUserInfo?: boolean;
  showBackButton?: boolean;
  onBackPress?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  showLogo = true,
  showUserInfo = true,
  showBackButton = false,
  onBackPress,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const styles = createStyles(theme, insets);

  const handleBackPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onBackPress) {
      onBackPress();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleProfilePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // @ts-ignore - Navigation typing
    navigation.navigate('Profile');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Left side */}
        <View style={styles.leftSection}>
          {showBackButton ? (
            <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
          ) : showLogo ? (
            <HeaderLogo size={40} />
          ) : null}
          
          {title && (
            <View style={styles.titleContainer}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {subtitle && (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Right side */}
        {showUserInfo && user && (
          <TouchableOpacity onPress={handleProfilePress} style={styles.userSection}>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {user.first_name || user.username}
              </Text>
              {user.account_type === 'premium' && (
                <Text style={styles.premiumBadge}>PRO</Text>
              )}
            </View>
            <Avatar
              name={user.first_name || user.username || 'User'}
              size={36}
              onPress={handleProfilePress}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const createStyles = (theme: Theme, insets: any) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.isDark 
        ? theme.colors.background 
        : theme.colors.white,
      paddingTop: insets.top || spacing['12'], // Fallback for devices without safe area
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.neutral[200],
      // Add subtle shadow for elevation
      ...theme.shadows.header,
    },
    content: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: layout.screenPadding,
      paddingVertical: spacing['3'], // 12px
      minHeight: spacing['14'], // 56px
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: spacing['3'], // 12px
    },
    backButton: {
      width: spacing['10'], // 40px
      height: spacing['10'], // 40px
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: spacing['5'], // 20px
      backgroundColor: theme.colors.neutral[100],
    },
    backButtonText: {
      fontSize: 24,
      color: theme.colors.text.primary,
      fontWeight: '600',
    },
    titleContainer: {
      flex: 1,
    },
    title: {
      ...textPresets.h3,
      color: theme.colors.text.primary,
      fontWeight: theme.typography.fontWeight.bold,
    },
    subtitle: {
      ...textPresets.caption,
      color: theme.colors.textSecondary,
      marginTop: spacing['0.5'], // 2px
    },
    userSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing['2'], // 8px
    },
    userInfo: {
      alignItems: 'flex-end',
    },
    userName: {
      ...textPresets.bodySmall,
      color: theme.colors.text.primary,
      fontWeight: theme.typography.fontWeight.medium,
      maxWidth: spacing['24'], // 96px - limit width for long names
    },
    premiumBadge: {
      ...textPresets.caption,
      color: theme.colors.primary[500],
      fontWeight: theme.typography.fontWeight.bold,
      backgroundColor: theme.colors.primary[50],
      paddingHorizontal: spacing['1.5'], // 6px
      paddingVertical: spacing['0.5'], // 2px
      borderRadius: spacing['1'], // 4px
      marginTop: spacing['0.5'], // 2px
    },
  });

export default AppHeader;