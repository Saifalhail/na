import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/hooks/useTheme';
import { getModernShadow } from '@/theme/shadows';
import { rs, moderateScale } from '@/utils/responsive';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  onPress?: () => void;
  disabled?: boolean;
  borderRadius?: number;
  padding?: number;
  animated?: boolean;
  animationDelay?: number;
  glassBorder?: boolean;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = 80,
  tint = 'light',
  onPress,
  disabled = false,
  borderRadius = moderateScale(16),
  padding = rs.large,
  animated = true,
  animationDelay = 0,
  glassBorder = true,
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
  
  const containerStyle: ViewStyle[] = [
    styles.container,
    {
      borderRadius,
      backgroundColor: Platform.OS === 'ios' ? 'transparent' : `${theme.colors.surface}CC`,
    },
    glassBorder && {
      borderWidth: 1,
      borderColor: themeMode === 'dark' 
        ? 'rgba(255, 255, 255, 0.15)' 
        : 'rgba(255, 255, 255, 0.35)',
    },
    getModernShadow('low'),
    style,
  ].filter(Boolean) as ViewStyle[];
  
  const blurViewStyle: ViewStyle = {
    borderRadius,
    overflow: 'hidden',
  };
  
  const innerContentStyle: ViewStyle = {
    padding,
    backgroundColor: Platform.OS === 'ios' 
      ? undefined 
      : themeMode === 'dark'
        ? 'rgba(0, 0, 0, 0.2)'
        : 'rgba(255, 255, 255, 0.2)',
  };
  
  const content = Platform.OS === 'ios' ? (
    <BlurView
      intensity={intensity}
      tint={tint}
      style={blurViewStyle}
    >
      <View style={innerContentStyle}>
        {children}
      </View>
    </BlurView>
  ) : (
    <View style={[blurViewStyle, innerContentStyle]}>
      {children}
    </View>
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
      <Animated.View
        entering={FadeIn.delay(animationDelay).springify()}
        style={containerStyle}
      >
        {content}
      </Animated.View>
    );
  }
  
  return (
    <View style={containerStyle}>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});