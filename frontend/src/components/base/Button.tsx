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
} from 'react-native';
import { useTheme } from '@theme/ThemeContext';
import { Theme } from '@theme/index';
import { getButtonAccessibilityProps } from '@/utils/accessibility';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large' | 'sm' | 'md' | 'lg';

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
}

// Map size aliases to standard sizes
const normalizeSize = (size: ButtonSize): 'small' | 'medium' | 'large' => {
  const sizeMap: Record<ButtonSize, 'small' | 'medium' | 'large'> = {
    small: 'small',
    sm: 'small',
    medium: 'medium',
    md: 'medium',
    large: 'large',
    lg: 'large',
  };
  return sizeMap[size];
};

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
  ...props
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const normalizedSize = normalizeSize(size);
  const isDisabled = disabled || loading;

  // Get button text for accessibility
  const buttonText = typeof children === 'string' ? children : accessibilityLabel || 'Button';
  const accessibilityProps = getButtonAccessibilityProps(buttonText, disabled, loading);

  const buttonStyle: ViewStyle[] = [
    styles.base,
    styles[variant],
    styles[`${normalizedSize}Size`],
    ...(fullWidth ? [styles.fullWidth] : []),
    ...(isDisabled ? [styles.disabled] : []),
    ...(isDisabled ? [styles[`${variant}Disabled`]] : []),
    ...(style ? [style as ViewStyle] : []),
  ];

  const textStyle: TextStyle[] = [
    styles.textBase,
    styles[`${variant}Text`],
    styles[`${normalizedSize}Text`],
    ...(isDisabled ? [styles.disabledText] : []),
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      disabled={isDisabled}
      activeOpacity={0.7}
      {...accessibilityProps}
      accessibilityHint={accessibilityHint}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          testID="activity-indicator"
          size={size === 'small' ? 'small' : 'small'}
          color={
            variant === 'primary' || variant === 'danger' ? '#FFFFFF' : theme.colors.primary[500]
          }
        />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          <Text style={textStyle}>{children}</Text>
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
    },
    danger: {
      backgroundColor: theme.colors.error[500],
    },

    // Sizes
    smallSize: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.s,
    },
    mediumSize: {
      paddingVertical: theme.spacing.s,
      paddingHorizontal: theme.spacing.m,
    },
    largeSize: {
      paddingVertical: theme.spacing.m,
      paddingHorizontal: theme.spacing.l,
    },

    // Text
    textBase: {
      fontWeight: '600',
    },
    primaryText: {
      color: '#FFFFFF',
    },
    secondaryText: {
      color: '#FFFFFF',
    },
    outlineText: {
      color: theme.colors.primary[500],
    },
    textText: {
      color: theme.colors.primary[500],
    },
    dangerText: {
      color: '#FFFFFF',
    },

    // Text sizes
    smallText: {
      fontSize: theme.typography.fontSize.xs,
    },
    mediumText: {
      fontSize: theme.typography.fontSize.base,
    },
    largeText: {
      fontSize: theme.typography.fontSize.lg,
    },

    // States
    fullWidth: {
      width: '100%',
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
    disabledText: {
      color: theme.colors.neutral[600],
    },

    // Layout
    content: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconLeft: {
      marginRight: theme.spacing.xs,
    },
    iconRight: {
      marginLeft: theme.spacing.xs,
    },
  });

export default Button;
