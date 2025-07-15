import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { UI } from '@/constants/uiConstants';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';

interface UnifiedButtonProps {
  children: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const UnifiedButton: React.FC<UnifiedButtonProps> = ({
  children,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  fullWidth = false,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: 12,
          paddingHorizontal: 20,
        };
      case 'large':
        return {
          paddingVertical: 20,
          paddingHorizontal: 32,
        };
      default:
        return {
          paddingVertical: UI.buttonPadding.vertical,
          paddingHorizontal: UI.buttonPadding.horizontal,
        };
    }
  };

  const getTextSizeStyle = (): TextStyle => {
    switch (size) {
      case 'small':
        return {
          fontSize: 14,
        };
      case 'large':
        return {
          fontSize: 18,
        };
      default:
        return {
          fontSize: 16,
        };
    }
  };

  const renderContent = () => {
    const textColor = variant === 'primary' ? '#FFFFFF' : 
      theme.isDark ? '#FFFFFF' : UI.gradientColors.blue[0];
    const content = (
      <>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={textColor}
            style={styles.loader}
          />
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <View style={styles.iconLeft}>{icon}</View>
            )}
            <Text
              style={[
                styles.text,
                getTextSizeStyle(),
                { color: textColor },
                textStyle,
              ]}
            >
              {children}
            </Text>
            {icon && iconPosition === 'right' && (
              <View style={styles.iconRight}>{icon}</View>
            )}
          </>
        )}
      </>
    );

    return content;
  };

  const buttonStyle = [
    styles.button,
    getSizeStyle(),
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    style,
  ];

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={[buttonStyle, UI.shadows.button]}
      >
        <LinearGradient
          colors={UI.gradientColors.blue}
          style={[styles.gradient, getSizeStyle()]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {renderContent()}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const variantStyles = {
    secondary: [styles.secondary, UI.shadows.subtle],
    ghost: styles.ghost,
    danger: [styles.danger, UI.shadows.subtle],
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[buttonStyle, variantStyles[variant]]}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    button: {
      borderRadius: UI.buttonRadius,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    gradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    secondary: {
      backgroundColor: theme.isDark ? theme.colors.surface : '#FFFFFF',
      borderWidth: 2,
      borderColor: UI.gradientColors.blue[0],
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    danger: {
      backgroundColor: theme.colors.error[500],
    },
    text: {
      fontWeight: '600',
      textAlign: 'center',
    },
    disabled: {
      opacity: 0.6,
    },
    fullWidth: {
      width: '100%',
    },
    loader: {
      marginHorizontal: 8,
    },
    iconLeft: {
      marginRight: 8,
    },
    iconRight: {
      marginLeft: 8,
    },
  });