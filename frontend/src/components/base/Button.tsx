import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
  View,
  Platform,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';
import { getButtonAccessibilityProps } from '@/utils/accessibility';
import { getModernShadow } from '@/theme/shadows';
import { spacing, layout } from '@/theme/spacing';
import { textPresets } from '@/theme/typography';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text' | 'danger' | 'ghost';
export type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  children: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  // New props for enhanced functionality
  rounded?: boolean;
  elevation?: boolean;
  testID?: string;
}

export const Button: React.FC<ButtonProps> = React.memo(({
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  children,
  style,
  accessibilityLabel,
  accessibilityHint,
  rounded = false,
  elevation = true,
  testID,
  ...props
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const isDisabled = disabled || loading;

  // Get button text for accessibility
  const buttonText = typeof children === 'string' ? children : accessibilityLabel || 'Button';
  const accessibilityProps = getButtonAccessibilityProps(buttonText, disabled, loading);

  const buttonStyle = [
    styles.base,
    styles[variant],
    styles[`${size}Size`],
    rounded && styles.rounded,
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    isDisabled && styles[`${variant}Disabled`],
    elevation && !isDisabled && styles.elevation,
    style as ViewStyle,
  ].filter(Boolean) as ViewStyle[];

  const textStyle = [
    styles.textBase,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    isDisabled && styles.disabledText,
  ].filter(Boolean) as TextStyle[];

  return (
    <TouchableOpacity
      style={buttonStyle}
      disabled={isDisabled}
      activeOpacity={0.7}
      {...accessibilityProps}
      accessibilityHint={accessibilityHint}
      testID={testID || `button-${variant}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          testID="button-activity-indicator"
          size={size === 'small' ? 'small' : 'small'}
          color={
            variant === 'primary' || variant === 'danger' || variant === 'secondary'
              ? theme.colors.white
              : theme.colors.primary[500]
          }
        />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          <Text style={textStyle} numberOfLines={2} adjustsFontSizeToFit={true} minimumFontScale={0.9}>
            {children}
          </Text>
          {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
});

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: layout.buttonBorderRadius,
      borderWidth: 0,
      minHeight: layout.minTouchTarget,
      overflow: 'hidden',
    },

    // Variants
    primary: {
      backgroundColor: theme.colors.primary[500],
    },
    secondary: {
      backgroundColor: theme.colors.secondary[500],
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: layout.borderWidth.medium,
      borderColor: theme.colors.primary[500],
    },
    text: {
      backgroundColor: 'transparent',
      paddingHorizontal: spacing['2'],
    },
    danger: {
      backgroundColor: theme.colors.error[500],
    },
    ghost: {
      backgroundColor: theme.colors.neutral[100],
      borderWidth: layout.borderWidth.thin,
      borderColor: theme.colors.neutral[200],
    },

    // Sizes
    smallSize: {
      paddingVertical: layout.buttonPadding.small.vertical,
      paddingHorizontal: layout.buttonPadding.small.horizontal,
      minHeight: spacing['8'], // 32px
    },
    mediumSize: {
      paddingVertical: layout.buttonPadding.medium.vertical,
      paddingHorizontal: layout.buttonPadding.medium.horizontal,
      minHeight: layout.minTouchTarget,
    },
    largeSize: {
      paddingVertical: layout.buttonPadding.large.vertical,
      paddingHorizontal: layout.buttonPadding.large.horizontal,
      minHeight: spacing['14'], // 56px
    },

    // Text
    textBase: {
      fontFamily: theme.typography.fontFamily.semibold,
      fontWeight: theme.typography.fontWeight.semibold,
      textAlign: 'center',
      letterSpacing: 0.25,
    },
    primaryText: {
      color: theme.colors.white,
    },
    secondaryText: {
      color: theme.colors.white,
    },
    outlineText: {
      color: theme.colors.primary[500],
    },
    textText: {
      color: theme.colors.primary[500],
    },
    dangerText: {
      color: theme.colors.white,
    },
    ghostText: {
      color: theme.colors.text.primary,
    },

    // Text sizes using textPresets
    smallText: {
      ...textPresets.buttonSmall,
    },
    mediumText: {
      ...textPresets.button,
    },
    largeText: {
      ...textPresets.buttonLarge,
    },

    // States
    fullWidth: {
      width: '100%',
    },
    rounded: {
      borderRadius: spacing['12'], // 48px for pill shape
    },
    disabled: {
      opacity: 0.6,
    },
    primaryDisabled: {
      backgroundColor: theme.colors.neutral[300],
    },
    secondaryDisabled: {
      backgroundColor: theme.colors.neutral[300],
    },
    outlineDisabled: {
      borderColor: theme.colors.neutral[300],
      backgroundColor: 'transparent',
    },
    textDisabled: {
      backgroundColor: 'transparent',
    },
    dangerDisabled: {
      backgroundColor: theme.colors.neutral[300],
    },
    ghostDisabled: {
      backgroundColor: theme.colors.neutral[50],
      borderColor: theme.colors.neutral[200],
    },
    disabledText: {
      color: theme.colors.text.disabled,
    },

    // Modern elevation system
    elevation: {
      ...getModernShadow('button'),
    },

    // Layout
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing['2'], // 8px gap between icon and text
    },
    iconLeft: {
      marginRight: spacing['2'],
    },
    iconRight: {
      marginLeft: spacing['2'],
    },
  });

export default Button;
