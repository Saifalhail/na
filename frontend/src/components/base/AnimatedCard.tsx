import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  ViewStyle,
  StyleProp,
  TouchableOpacity,
  TouchableOpacityProps,
  Platform,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';

export type AnimationType = 'fadeIn' | 'slideUp' | 'slideIn' | 'scale' | 'spring';

interface AnimatedCardProps extends Omit<TouchableOpacityProps, 'style'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  animationType?: AnimationType;
  delay?: number;
  duration?: number;
  springTension?: number;
  springFriction?: number;
  startOffset?: number;
  touchable?: boolean;
  elevation?: number;
  borderRadius?: number;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  style,
  animationType = 'fadeIn',
  delay = 0,
  duration = 400,
  springTension = 40,
  springFriction = 7,
  startOffset = 50,
  touchable = false,
  elevation = 2,
  borderRadius = 12,
  onPress,
  ...touchableProps
}) => {
  const { theme } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    const animation = createAnimation();
    
    const timeout = setTimeout(() => {
      animation.start();
    }, delay);

    return () => clearTimeout(timeout);
  }, [animationType, delay, duration]);

  const createAnimation = () => {
    switch (animationType) {
      case 'spring':
        return Animated.spring(animatedValue, {
          toValue: 1,
          tension: springTension,
          friction: springFriction,
          useNativeDriver: true,
        });
      case 'scale':
        return Animated.parallel([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.spring(scaleValue, {
            toValue: 1,
            tension: springTension,
            friction: springFriction,
            useNativeDriver: true,
          }),
        ]);
      default:
        return Animated.timing(animatedValue, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        });
    }
  };

  const getAnimatedStyle = (): any => {
    switch (animationType) {
      case 'fadeIn':
        return {
          opacity: animatedValue,
        };
      case 'slideUp':
        return {
          opacity: animatedValue,
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [startOffset, 0],
              }),
            },
          ],
        };
      case 'slideIn':
        return {
          opacity: animatedValue,
          transform: [
            {
              translateX: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [startOffset, 0],
              }),
            },
          ],
        };
      case 'scale':
        return {
          opacity: animatedValue,
          transform: [{ scale: scaleValue }],
        };
      case 'spring':
        return {
          opacity: animatedValue,
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [startOffset, 0],
              }),
            },
            {
              scale: animatedValue.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.95, 1.02, 1],
              }),
            },
          ],
        };
      default:
        return {};
    }
  };

  const cardStyle = getCardStyle(theme, elevation, borderRadius);
  const combinedStyle = [cardStyle, style];

  const content = (
    <Animated.View style={[combinedStyle, getAnimatedStyle()]}>
      {children}
    </Animated.View>
  );

  if (touchable && onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        {...touchableProps}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const getCardStyle = (theme: Theme, elevation: number, borderRadius: number): ViewStyle => ({
  backgroundColor: theme.colors.surface,
  borderRadius,
  padding: 16,
  ...Platform.select({
    ios: {
      shadowColor: theme.colors.text.primary,
      shadowOffset: { width: 0, height: elevation },
      shadowOpacity: 0.1,
      shadowRadius: elevation * 2,
    },
    android: {
      elevation,
    },
  }),
});

// Preset animations for common use cases
export const AnimatedCardPresets = {
  hero: {
    animationType: 'spring' as AnimationType,
    springTension: 45,
    springFriction: 8,
    startOffset: 60,
  },
  list: {
    animationType: 'slideUp' as AnimationType,
    duration: 300,
    startOffset: 30,
  },
  modal: {
    animationType: 'scale' as AnimationType,
    duration: 250,
  },
  subtle: {
    animationType: 'fadeIn' as AnimationType,
    duration: 500,
  },
};