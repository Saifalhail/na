import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';
import { getModernShadow } from '@/theme/shadows';
import { spacing, layout } from '@/theme/spacing';
import Animated, { FadeInDown, FadeInUp, ZoomIn, SlideInRight } from 'react-native-reanimated';

export type GradientVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'cardBlue'
  | 'cardBlueLight'
  | 'cardWhite'
  | 'cardGreen'
  | 'glass'
  | 'custom';
export type AnimationType = 'fadeDown' | 'fadeUp' | 'zoomIn' | 'slideRight' | 'none';

interface GradientCardProps extends ViewProps {
  children: React.ReactNode;
  variant?: GradientVariant;
  customColors?: string[];
  gradientStyle?: ViewStyle;
  onPress?: () => void;
  disabled?: boolean;
  elevated?: boolean;
  borderRadius?: number;
  padding?: 'none' | 'small' | 'medium' | 'large' | 'xl';
  animated?: boolean;
  animationType?: AnimationType;
  animationDelay?: number;
  borderWidth?: number;
  borderColor?: string;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedView = Animated.createAnimatedComponent(View);

export const GradientCard: React.FC<GradientCardProps> = ({
  children,
  variant = 'cardBlue',
  customColors,
  style,
  gradientStyle,
  onPress,
  disabled = false,
  elevated = true,
  borderRadius = spacing['4'], // 16px
  padding = 'medium',
  animated = true,
  animationType = 'fadeDown',
  animationDelay = 0,
  borderWidth = 0,
  borderColor,
  start,
  end,
  ...props
}) => {
  const { theme } = useTheme();

  const getGradientColors = (): readonly [string, string, ...string[]] => {
    if (customColors && customColors.length >= 2) {
      return customColors as unknown as readonly [string, string, ...string[]];
    }

    const gradients = theme.colors.gradients;
    
    switch (variant) {
      case 'primary':
        return gradients.primary.colors as readonly [string, string, ...string[]];
      case 'secondary':
        return gradients.secondary.colors as readonly [string, string, ...string[]];
      case 'success':
        return gradients.success.colors as readonly [string, string, ...string[]];
      case 'warning':
        return gradients.warning.colors as readonly [string, string, ...string[]];
      case 'error':
        return gradients.error.colors as readonly [string, string, ...string[]];
      case 'info':
        return gradients.info.colors as readonly [string, string, ...string[]];
      case 'cardBlue':
        return gradients.cardBlue.colors as readonly [string, string, ...string[]];
      case 'cardBlueLight':
        return gradients.cardBlueLight.colors as readonly [string, string, ...string[]];
      case 'cardWhite':
        return gradients.cardWhite.colors as readonly [string, string, ...string[]];
      case 'cardGreen':
        return gradients.cardGreen.colors as readonly [string, string, ...string[]];
      case 'glass':
        return theme.isDark 
          ? gradients.glassWhite.colors as readonly [string, string, ...string[]]
          : gradients.glassBlue.colors as readonly [string, string, ...string[]];
      default:
        return gradients.cardBlue.colors as readonly [string, string, ...string[]];
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

  const getPaddingValue = () => {
    switch (padding) {
      case 'none': return 0;
      case 'small': return spacing['3']; // 12px
      case 'medium': return layout.cardPadding; // 16px
      case 'large': return layout.cardPaddingLarge; // 24px
      case 'xl': return spacing['8']; // 32px
      default: return layout.cardPadding;
    }
  };

  const containerStyle = [
    styles.container,
    elevated && getModernShadow('card'),
    { borderRadius },
    borderWidth > 0 && { borderWidth, borderColor: borderColor || theme.colors.border },
    style
  ].filter(Boolean);

  const gradientStyleCombined = [
    styles.gradient,
    { borderRadius, padding: getPaddingValue() },
    gradientStyle
  ];

  const content = (
    <LinearGradient
      colors={getGradientColors()}
      start={start || { x: 0, y: 0 }}
      end={end || { x: 1, y: 1 }}
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
    overflow: 'hidden',
  },
  gradient: {
    width: '100%',
  },
});
