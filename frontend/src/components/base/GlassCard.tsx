import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { getModernShadow } from '@/theme/shadows';
import { moderateScale } from '@/utils/responsive';
import { spacing } from '@/theme/spacing';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default' | 'prominent';
  onPress?: () => void;
  disabled?: boolean;
  borderRadius?: number;
  padding?: number;
  animated?: boolean;
  animationDelay?: number;
  glassBorder?: boolean;
  variant?: 'glass' | 'frosted' | 'subtle';
  gradient?: boolean;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = 100,
  tint = 'default',
  onPress,
  disabled = false,
  borderRadius = moderateScale(16),
  padding = spacing['4'],
  animated = true,
  animationDelay = 0,
  glassBorder = true,
  variant = 'glass',
  gradient = true,
}) => {
  const { theme, themeMode } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const intensityByVariant = {
    glass: 100,
    frosted: 80,
    subtle: 60,
  }[variant];

  const gradientColors = {
    glass: themeMode === 'dark'
      ? ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.03)'] as const
      : ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)'] as const,
    frosted: themeMode === 'dark'
      ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)'] as const
      : ['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.6)'] as const,
    subtle: themeMode === 'dark'
      ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)'] as const
      : ['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.4)'] as const,
  }[variant];

  const borderColors = {
    glass: themeMode === 'dark'
      ? 'rgba(255,255,255,0.15)'
      : 'rgba(255,255,255,0.8)',
    frosted: themeMode === 'dark'
      ? 'rgba(255,255,255,0.1)'
      : 'rgba(0,0,0,0.05)',
    subtle: themeMode === 'dark'
      ? 'rgba(255,255,255,0.05)'
      : 'rgba(0,0,0,0.03)',
  }[variant];

  const containerStyle: ViewStyle[] = [
    styles.container,
    {
      borderRadius,
      backgroundColor: Platform.OS === 'ios' ? 'transparent' : `${theme.colors.surface}CC`,
    },
    glassBorder && {
      borderWidth: 1,
      borderColor: borderColors,
    },
    getModernShadow('cardElevated'),
    style,
  ].filter(Boolean) as ViewStyle[];

  const blurViewStyle: ViewStyle = {
    borderRadius,
    overflow: 'hidden',
  };

  const innerContentStyle: ViewStyle = {
    padding,
    backgroundColor:
      Platform.OS === 'ios'
        ? undefined
        : themeMode === 'dark'
          ? 'rgba(0, 0, 0, 0.2)'
          : 'rgba(255, 255, 255, 0.2)',
  };

  const content =
    Platform.OS === 'ios' ? (
      <>
        <BlurView 
          intensity={intensityByVariant} 
          tint={tint === 'prominent' ? (themeMode === 'dark' ? 'dark' : 'extraLight') : tint} 
          style={[blurViewStyle, StyleSheet.absoluteFillObject]} 
        />
        {gradient && (
          <LinearGradient
            colors={gradientColors}
            style={[StyleSheet.absoluteFillObject, { borderRadius }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        )}
        <View style={innerContentStyle}>{children}</View>
      </>
    ) : (
      <>
        {gradient && (
          <LinearGradient
            colors={gradientColors}
            style={[StyleSheet.absoluteFillObject, { borderRadius }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        )}
        <View style={[blurViewStyle, innerContentStyle]}>{children}</View>
      </>
    );

  if (onPress) {
    if (animated) {
      return (
        <AnimatedTouchableOpacity
          entering={FadeIn.delay(animationDelay).springify()}
          style={[containerStyle, animatedStyle]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          activeOpacity={0.9}
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
        activeOpacity={0.9}
      >
        {content}
      </TouchableOpacity>
    );
  }

  if (animated) {
    return (
      <Animated.View entering={FadeIn.delay(animationDelay).springify()} style={containerStyle}>
        {content}
      </Animated.View>
    );
  }

  return <View style={containerStyle}>{content}</View>;
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
