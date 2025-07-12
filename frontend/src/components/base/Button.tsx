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

export const Button: React.FC<ButtonProps> = ({
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
          <Text style={textStyle} numberOfLines={1}>
            {children}
          </Text>
          {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.m,
      minHeight: 44, // Accessibility minimum touch target
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
      borderWidth: 1,
      borderColor: theme.colors.primary[500],
    },
    text: {
      backgroundColor: 'transparent',
      paddingHorizontal: theme.spacing.xs,
    },
    danger: {
      backgroundColor: theme.colors.error[500],
    },
    ghost: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: 'transparent',
    },

    // Sizes
    smallSize: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.s,
      minHeight: 32,
    },
    mediumSize: {
      paddingVertical: theme.spacing.s,
      paddingHorizontal: theme.spacing.m,
      minHeight: 44,
    },
    largeSize: {
      paddingVertical: theme.spacing.m,
      paddingHorizontal: theme.spacing.l,
      minHeight: 56,
    },

    // Text
    textBase: {
      fontFamily: theme.typography.fontFamily.medium,
      fontWeight: '600',
      textAlign: 'center',
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
      color: theme.colors.neutral[700],
    },

    // Text sizes
    smallText: {
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.fontSize.sm * 1.2,
    },
    mediumText: {
      fontSize: theme.typography.fontSize.base,
      lineHeight: theme.typography.fontSize.base * 1.2,
    },
    largeText: {
      fontSize: theme.typography.fontSize.lg,
      lineHeight: theme.typography.fontSize.lg * 1.2,
    },

    // States
    fullWidth: {
      width: '100%',
    },
    rounded: {
      borderRadius: 999,
    },
    disabled: {
      opacity: 0.5,
    },
    primaryDisabled: {
      backgroundColor: theme.colors.neutral[400],
    },
    secondaryDisabled: {
      backgroundColor: theme.colors.neutral[400],
    },
    outlineDisabled: {
      borderColor: theme.colors.neutral[400],
    },
    textDisabled: {},
    dangerDisabled: {
      backgroundColor: theme.colors.neutral[400],
    },
    ghostDisabled: {
      backgroundColor: 'transparent',
    },
    disabledText: {
      color: theme.colors.neutral[500],
    },

    // Elevation
    elevation: Platform.select({
      ios: {
        shadowColor: theme.colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),

    // Layout
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconLeft: {
      marginRight: theme.spacing.xs,
    },
    iconRight: {
      marginLeft: theme.spacing.xs,
    },
  });

export default Button;
