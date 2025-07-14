import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { getModernShadow } from '@/theme/shadows';
import { rs, moderateScale } from '@/utils/responsive';
import Animated, { FadeInDown, FadeInUp, ZoomIn, SlideInRight } from 'react-native-reanimated';

export type GradientVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  | 'custom';
export type AnimationType = 'fadeDown' | 'fadeUp' | 'zoomIn' | 'slideRight' | 'none';

interface GradientCardProps {
  children: React.ReactNode;
  variant?: GradientVariant;
  customColors?: string[];
  style?: ViewStyle;
  gradientStyle?: ViewStyle;
  onPress?: () => void;
  disabled?: boolean;
  elevation?: 'low' | 'medium' | 'high';
  borderRadius?: number;
  padding?: number;
  animated?: boolean;
  animationType?: AnimationType;
  animationDelay?: number;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedView = Animated.createAnimatedComponent(View);

export const GradientCard: React.FC<GradientCardProps> = ({
  children,
  variant = 'primary',
  customColors,
  style,
  gradientStyle,
  onPress,
  disabled = false,
  elevation = 'medium',
  borderRadius = moderateScale(16),
  padding = rs.large,
  animated = true,
  animationType = 'fadeDown',
  animationDelay = 0,
}) => {
  const { theme } = useTheme();

  const getGradientColors = (): readonly [string, string, ...string[]] => {
    if (customColors && customColors.length >= 2) {
      return customColors as unknown as readonly [string, string, ...string[]];
    }

    switch (variant) {
      case 'primary':
        return [theme.colors.primary[400] + '15', theme.colors.primary[500] + '08'] as const;
      case 'secondary':
        return [theme.colors.secondary[400] + '15', theme.colors.secondary[500] + '08'] as const;
      case 'success':
        return [theme.colors.success[400] + '15', theme.colors.success[500] + '08'] as const;
      case 'warning':
        return [theme.colors.warning[400] + '15', theme.colors.warning[500] + '08'] as const;
      case 'error':
        return [theme.colors.error[400] + '15', theme.colors.error[500] + '08'] as const;
      case 'info':
        return [theme.colors.info[400] + '15', theme.colors.info[500] + '08'] as const;
      case 'neutral':
        return [theme.colors.neutral[200] + '20', theme.colors.neutral[300] + '10'] as const;
      default:
        return [theme.colors.primary[400] + '15', theme.colors.primary[500] + '08'] as const;
    }
  };

  const getAnimation = () => {
    switch (animationType) {
      case 'fadeDown':
        return FadeInDown.delay(animationDelay).springify();
      case 'fadeUp':
        return FadeInUp.delay(animationDelay).springify();
      case 'zoomIn':
        return ZoomIn.delay(animationDelay).springify();
      case 'slideRight':
        return SlideInRight.delay(animationDelay).springify();
      default:
        return undefined;
    }
  };

  const containerStyle = [styles.container, getModernShadow(elevation), { borderRadius }, style];

  const gradientStyleCombined = [styles.gradient, { borderRadius, padding }, gradientStyle];

  const content = (
    <LinearGradient
      colors={getGradientColors()}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={gradientStyleCombined}
    >
      {children}
    </LinearGradient>
  );

  if (onPress) {
    if (animated) {
      return (
        <AnimatedTouchableOpacity
          entering={getAnimation()}
          style={containerStyle}
          onPress={onPress}
          disabled={disabled}
          activeOpacity={0.8}
        >
          {content}
        </AnimatedTouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={containerStyle}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
      >
        {content}
      </TouchableOpacity>
    );
  }

  if (animated) {
    return (
      <AnimatedView entering={getAnimation()} style={containerStyle}>
        {content}
      </AnimatedView>
    );
  }

  return <View style={containerStyle}>{content}</View>;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  gradient: {
    width: '100%',
  },
});
