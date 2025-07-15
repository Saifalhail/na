import React from 'react';
import { View, TouchableOpacity, ViewStyle, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, ZoomIn, SlideInRight } from 'react-native-reanimated';
import { UI } from '@/constants/uiConstants';
import { useTheme } from '@/hooks/useTheme';

export type CardSize = 'small' | 'medium' | 'large' | 'custom';
export type AnimationType = 'fadeDown' | 'fadeUp' | 'zoomIn' | 'slideRight' | 'none';

interface UnifiedCardProps {
  children: React.ReactNode;
  size?: CardSize;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  animated?: boolean;
  animationType?: AnimationType;
  animationDelay?: number;
  noPadding?: boolean;
  width?: number | string;
  height?: number | string;
  gradient?: boolean;
  backgroundColor?: string;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export const UnifiedCard: React.FC<UnifiedCardProps> = ({
  children,
  size = 'medium',
  onPress,
  disabled = false,
  style,
  contentStyle,
  animated = true,
  animationType = 'fadeDown',
  animationDelay = 0,
  noPadding = false,
  width,
  height,
  gradient = false,
  backgroundColor,
}) => {
  const { theme } = useTheme();
  const getAnimation = () => {
    if (!animated) return undefined;
    
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

  const getSizeStyle = (): ViewStyle => {
    if (width || height) {
      return {
        width: width,
        height: height,
      };
    }

    switch (size) {
      case 'small':
        return {
          minHeight: 80,
        };
      case 'medium':
        return {
          minHeight: 120,
        };
      case 'large':
        return {
          minHeight: 160,
        };
      case 'custom':
        return {};
      default:
        return {
          minHeight: 120,
        };
    }
  };

  const containerStyle = [
    styles.container,
    UI.shadows.premium,
    getSizeStyle(),
    style,
  ];


  const innerStyle = [
    styles.gradient,
    !noPadding && styles.padding,
    !gradient && {
      backgroundColor: backgroundColor || (theme.isDark ? theme.colors.surface : '#FFFFFF'),
    },
    contentStyle,
  ];

  const content = gradient ? (
    <LinearGradient
      colors={UI.gradientColors.blue}
      style={innerStyle}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {children}
    </LinearGradient>
  ) : (
    <View style={innerStyle}>
      {children}
    </View>
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
    if (gradient) {
      return (
        <AnimatedLinearGradient
          entering={getAnimation()}
          colors={UI.gradientColors.blue}
          style={[containerStyle, innerStyle]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {children}
        </AnimatedLinearGradient>
      );
    } else {
      const AnimatedView = Animated.createAnimatedComponent(View);
      return (
        <AnimatedView
          entering={getAnimation()}
          style={[containerStyle, innerStyle]}
        >
          {children}
        </AnimatedView>
      );
    }
  }

  return (
    <View style={containerStyle}>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: UI.cardRadius,
    overflow: 'hidden',
  },
  gradient: {
    width: '100%',
    height: '100%',
  },
  padding: {
    padding: UI.cardPadding,
  },
});