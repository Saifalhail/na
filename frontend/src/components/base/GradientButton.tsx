import React, { useRef, useEffect, useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  Animated,
  View,
  TouchableOpacityProps,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';

export type GradientButtonSize = 'small' | 'medium' | 'large';
export type GradientButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'premium';

interface GradientButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  children: React.ReactNode;
  variant?: GradientButtonVariant;
  size?: GradientButtonSize;
  style?: ViewStyle;
  textStyle?: TextStyle;
  loading?: boolean;
  shimmer?: boolean;
  hapticFeedback?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  style,
  textStyle,
  loading = false,
  shimmer = true,
  hapticFeedback = true,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled,
  onPress,
  ...touchableProps
}) => {
  const { theme } = useTheme();
  const shimmerAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    if (shimmer && !disabled && !loading) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnimation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnimation, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();

      return () => animation.stop();
    }
    return () => {}; // Return cleanup function for all paths
  }, [shimmer, disabled, loading]);

  const handlePressIn = () => {
    setIsPressed(true);
    Animated.spring(scaleAnimation, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.spring(scaleAnimation, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = async (event: any) => {
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.(event);
  };

  const gradientColors = getGradientColors(variant, theme, isPressed);
  const buttonStyle = getButtonStyle(size, fullWidth);
  const textStyles = getTextStyle(size, theme);

  const shimmerTranslateX = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnimation }] },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        disabled={disabled || loading}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        {...touchableProps}
      >
        <LinearGradient
          colors={disabled ? [theme.colors.neutral[300], theme.colors.neutral[400]] : gradientColors as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[buttonStyle, disabled && styles.disabled]}
        >
          {shimmer && !disabled && !loading && (
            <Animated.View
              style={[
                styles.shimmerOverlay,
                {
                  transform: [{ translateX: shimmerTranslateX }],
                },
              ]}
            >
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.3)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shimmerGradient}
              />
            </Animated.View>
          )}

          <View style={styles.contentContainer}>
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                {icon && iconPosition === 'left' && (
                  <View style={styles.iconLeft}>{icon}</View>
                )}
                <Text style={[textStyles, textStyle, disabled && styles.disabledText]}>
                  {children}
                </Text>
                {icon && iconPosition === 'right' && (
                  <View style={styles.iconRight}>{icon}</View>
                )}
              </>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const getGradientColors = (variant: GradientButtonVariant, theme: any, isPressed: boolean) => {
  const colors = {
    primary: isPressed 
      ? [theme.colors.primary[700], theme.colors.primary[900]]
      : [theme.colors.primary[500], theme.colors.primary[700]],
    secondary: isPressed
      ? [theme.colors.secondary[700], theme.colors.secondary[900]]
      : [theme.colors.secondary[500], theme.colors.secondary[700]],
    success: isPressed
      ? ['#22c55e', '#16a34a']
      : ['#34d399', '#22c55e'],
    danger: isPressed
      ? ['#dc2626', '#b91c1c']
      : ['#ef4444', '#dc2626'],
    premium: isPressed
      ? ['#9333ea', '#7c3aed']
      : ['#a855f7', '#9333ea'],
  };

  return colors[variant] || colors.primary;
};

const getButtonStyle = (size: GradientButtonSize, fullWidth: boolean): ViewStyle => {
  const baseStyle: ViewStyle = {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  };

  const sizes = {
    small: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      minHeight: 36,
    },
    medium: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      minHeight: 48,
    },
    large: {
      paddingVertical: 16,
      paddingHorizontal: 32,
      minHeight: 56,
    },
  };

  return {
    ...baseStyle,
    ...sizes[size],
    ...(fullWidth && { width: '100%' }),
  };
};

const getTextStyle = (size: GradientButtonSize, theme: any): TextStyle => {
  const sizes = {
    small: {
      fontSize: 14,
      lineHeight: 20,
    },
    medium: {
      fontSize: 16,
      lineHeight: 24,
    },
    large: {
      fontSize: 18,
      lineHeight: 28,
    },
  };

  return {
    ...sizes[size],
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  };
};

const styles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },
  disabledText: {
    opacity: 0.8,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  shimmerGradient: {
    width: 100,
    height: '100%',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

// Preset gradient configurations
export const GradientButtonPresets = {
  cta: {
    variant: 'primary' as GradientButtonVariant,
    size: 'large' as GradientButtonSize,
    shimmer: true,
    hapticFeedback: true,
  },
  premium: {
    variant: 'premium' as GradientButtonVariant,
    size: 'medium' as GradientButtonSize,
    shimmer: true,
  },
  danger: {
    variant: 'danger' as GradientButtonVariant,
    size: 'medium' as GradientButtonSize,
    shimmer: false,
  },
};