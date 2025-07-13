import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';
import { borderRadius, rs } from '@/utils/responsive';

export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
export type BadgeSize = 'small' | 'medium' | 'large';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  count?: number;
  maxCount?: number;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
  accessibilityLabel?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  dot = false,
  count,
  maxCount = 99,
  style,
  textStyle,
  testID,
  accessibilityLabel,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Handle count display
  const displayCount = count !== undefined && count > maxCount ? `${maxCount}+` : count;
  const content = count !== undefined ? displayCount : children;

  // Create accessibility label
  const defaultAccessibilityLabel = count !== undefined 
    ? `${count} notifications`
    : typeof children === 'string' 
    ? children 
    : 'Badge';

  const badgeStyle = [
    styles.base,
    styles[variant],
    styles[`${size}Size`],
    dot && styles.dot,
    style,
  ].filter(Boolean) as ViewStyle[];

  const badgeTextStyle = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    textStyle,
  ].filter(Boolean) as TextStyle[];

  if (dot) {
    return (
      <View
        style={[styles.dot, styles[`${size}Dot`], styles[variant], style]}
        testID={testID || 'badge-dot'}
        accessibilityLabel={accessibilityLabel || 'Status indicator'}
        accessibilityRole="none"
      />
    );
  }

  return (
    <View
      style={badgeStyle}
      testID={testID || `badge-${variant}`}
      accessibilityLabel={accessibilityLabel || defaultAccessibilityLabel}
      accessibilityRole="text"
    >
      <Text style={badgeTextStyle} numberOfLines={1}>
        {content}
      </Text>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.borderRadius.full,
      paddingHorizontal: theme.spacing.xs,
    },

    // Variants
    primary: {
      backgroundColor: theme.colors.primary[500],
    },
    secondary: {
      backgroundColor: theme.colors.secondary[500],
    },
    success: {
      backgroundColor: theme.colors.success[500],
    },
    warning: {
      backgroundColor: theme.colors.warning[500],
    },
    error: {
      backgroundColor: theme.colors.error[500],
    },
    info: {
      backgroundColor: theme.colors.info[500],
    },
    neutral: {
      backgroundColor: theme.colors.neutral[500],
    },

    // Text variants
    primaryText: {
      color: theme.colors.white,
    },
    secondaryText: {
      color: theme.colors.white,
    },
    successText: {
      color: theme.colors.white,
    },
    warningText: {
      color: theme.colors.black,
    },
    errorText: {
      color: theme.colors.white,
    },
    infoText: {
      color: theme.colors.white,
    },
    neutralText: {
      color: theme.colors.white,
    },

    // Sizes
    smallSize: {
      minWidth: 16,
      height: 16,
      paddingHorizontal: theme.spacing.xxs,
    },
    mediumSize: {
      minWidth: 20,
      height: 20,
      paddingHorizontal: theme.spacing.xs,
    },
    largeSize: {
      minWidth: 24,
      height: 24,
      paddingHorizontal: theme.spacing.xs,
    },

    // Text
    text: {
      fontFamily: theme.typography.fontFamily.medium,
      fontWeight: '600',
      textAlign: 'center',
    },

    // Text sizes
    smallText: {
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.fontSize.xs * 1.2,
    },
    mediumText: {
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.fontSize.sm * 1.2,
    },
    largeText: {
      fontSize: theme.typography.fontSize.base,
      lineHeight: theme.typography.fontSize.base * 1.2,
    },

    // Dot styles
    dot: {
      width: 8,
      height: 8,
      minWidth: 8,
      paddingHorizontal: 0,
    },
    smallDot: {
      width: 6,
      height: 6,
      minWidth: 6,
    },
    mediumDot: {
      width: 8,
      height: 8,
      minWidth: 8,
    },
    largeDot: {
      width: 10,
      height: 10,
      minWidth: 10,
    },
  });

export default Badge;