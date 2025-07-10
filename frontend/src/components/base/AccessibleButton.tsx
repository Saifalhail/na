import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { getButtonAccessibilityProps } from '@/utils/accessibility';

interface AccessibleButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  ...props
}) => {
  const { theme } = useTheme();
  
  const isDisabled = disabled || loading;
  
  const buttonStyles = [
    styles.button,
    styles[size],
    fullWidth && styles.fullWidth,
    getVariantStyles(variant, theme),
    isDisabled && styles.disabled,
    style,
  ];
  
  const textStyles = [
    styles.text,
    styles[`${size}Text`],
    getVariantTextStyles(variant, theme),
    isDisabled && styles.disabledText,
    textStyle,
  ];
  
  const accessibilityProps = getButtonAccessibilityProps(
    accessibilityLabel || title,
    disabled,
    loading
  );
  
  return (
    <TouchableOpacity
      {...props}
      {...accessibilityProps}
      accessibilityHint={accessibilityHint}
      style={buttonStyles}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={getLoaderColor(variant, theme)}
          size={size === 'small' ? 'small' : 'small'}
        />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <View style={styles.iconLeft}>{icon}</View>
          )}
          <Text style={textStyles} numberOfLines={1}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <View style={styles.iconRight}>{icon}</View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const getVariantStyles = (variant: string, theme: any): ViewStyle => {
  switch (variant) {
    case 'primary':
      return {
        backgroundColor: theme.colors.primary[500],
        borderWidth: 0,
      };
    case 'secondary':
      return {
        backgroundColor: theme.colors.secondary[500],
        borderWidth: 0,
      };
    case 'outline':
      return {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.primary[500],
      };
    case 'text':
      return {
        backgroundColor: 'transparent',
        borderWidth: 0,
      };
    case 'danger':
      return {
        backgroundColor: theme.colors.error[500],
        borderWidth: 0,
      };
    default:
      return {};
  }
};

const getVariantTextStyles = (variant: string, theme: any): TextStyle => {
  switch (variant) {
    case 'primary':
    case 'secondary':
    case 'danger':
      return {
        color: '#FFFFFF',
      };
    case 'outline':
    case 'text':
      return {
        color: theme.colors.primary[500],
      };
    default:
      return {};
  }
};

const getLoaderColor = (variant: string, theme: any): string => {
  switch (variant) {
    case 'primary':
    case 'secondary':
    case 'danger':
      return '#FFFFFF';
    case 'outline':
    case 'text':
      return theme.colors.primary[500];
    default:
      return theme.colors.primary[500];
  }
};

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  // Size styles
  small: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 32,
  },
  medium: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  large: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 56,
  },
  // Text size styles
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
  // State styles
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.7,
  },
  fullWidth: {
    width: '100%',
  },
  // Icon styles
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});