import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';
import { spacing, layout } from '@/theme/spacing';
import { textPresets } from '@/theme/typography';
import { getModernShadow } from '@/theme/shadows';
import * as Haptics from 'expo-haptics';

interface PremiumButtonProps {
  children: string;
  onPress: () => void;
  variant?: 'gradient' | 'glow' | 'shimmer';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
  colors?: string[];
  fullWidth?: boolean;
}

export const PremiumButton: React.FC<PremiumButtonProps> = ({
  children,
  onPress,
  variant = 'gradient',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  colors,
  fullWidth = false,
}) => {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (variant === 'shimmer' && !disabled && !loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [variant, disabled, loading, shimmerAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const getGradientColors = (): readonly [string, string, ...string[]] => {
    if (colors && colors.length >= 2) {
      return colors as unknown as readonly [string, string, ...string[]];
    }
    
    switch (variant) {
      case 'gradient':
        return theme.isDark
          ? [theme.colors.primary[500], theme.colors.primary[700]] as const
          : [theme.colors.primary[400], theme.colors.primary[600]] as const;
      case 'glow':
        return ['#FF6B6B', '#4ECDC4', '#45B7D1'] as const;
      case 'shimmer':
        return theme.isDark
          ? [theme.colors.primary[600], theme.colors.primary[400], theme.colors.primary[600]] as const
          : [theme.colors.primary[500], theme.colors.primary[300], theme.colors.primary[500]] as const;
      default:
        return [theme.colors.primary[500], theme.colors.primary[600]] as const;
    }
  };

  const styles = createStyles(theme, size, fullWidth, variant);
  const isDisabled = disabled || loading;

  const content = (
    <>
      {loading ? (
        <ActivityIndicator color={theme.colors.white} size="small" />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <View style={styles.iconContainer}>{icon}</View>
          )}
          <Text style={[styles.text, textStyle]}>{children}</Text>
          {icon && iconPosition === 'right' && (
            <View style={[styles.iconContainer, styles.iconRight]}>{icon}</View>
          )}
        </>
      )}
    </>
  );

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ scale: scaleAnim }] },
        style,
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={0.8}
        style={styles.touchable}
      >
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, isDisabled && styles.disabled]}
        >
          {variant === 'shimmer' && !isDisabled && (
            <Animated.View
              style={[
                styles.shimmer,
                {
                  transform: [
                    {
                      translateX: shimmerAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-200, 200],
                      }),
                    },
                  ],
                },
              ]}
            />
          )}
          {content}
        </LinearGradient>
        {variant === 'glow' && !isDisabled && (
          <LinearGradient
            colors={[...getGradientColors(), 'transparent']}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.glowEffect}
          />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const createStyles = (theme: Theme, size: 'small' | 'medium' | 'large', fullWidth: boolean, variant: string) => {
  const sizeStyles: Record<'small' | 'medium' | 'large', any> = {
    small: {
      paddingVertical: spacing['2'], // 8px
      paddingHorizontal: spacing['4'], // 16px
      minHeight: spacing['8'], // 32px
    },
    medium: {
      paddingVertical: spacing['3'], // 12px
      paddingHorizontal: spacing['6'], // 24px
      minHeight: spacing['11'], // 44px
    },
    large: {
      paddingVertical: spacing['4'], // 16px
      paddingHorizontal: spacing['8'], // 32px
      minHeight: spacing['14'], // 56px
    },
  };

  const textSizeStyles: Record<'small' | 'medium' | 'large', any> = {
    small: textPresets.caption,
    medium: textPresets.body,
    large: textPresets.h4,
  };

  return StyleSheet.create({
    container: {
      width: fullWidth ? '100%' : undefined,
      ...getModernShadow('button'),
    },
    touchable: {
      width: '100%',
      borderRadius: layout.buttonBorderRadius,
      overflow: 'hidden',
    },
    gradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: layout.buttonBorderRadius,
      ...sizeStyles[size],
      position: 'relative',
      overflow: 'hidden',
    },
    text: {
      ...textSizeStyles[size],
      color: theme.colors.white,
      fontWeight: theme.typography.fontWeight.semibold,
      textAlign: 'center',
    },
    iconContainer: {
      marginRight: spacing['2'], // 8px
    },
    iconRight: {
      marginRight: 0,
      marginLeft: spacing['2'], // 8px
    },
    disabled: {
      opacity: 0.6,
    },
    shimmer: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: 100,
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      transform: [{ skewX: '-20deg' }],
    },
    glowEffect: {
      position: 'absolute',
      bottom: -20,
      left: '20%',
      right: '20%',
      height: 40,
      borderRadius: 20,
      opacity: 0.4,
    },
  });
};

export default PremiumButton;