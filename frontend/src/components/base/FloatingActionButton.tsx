import React, { useRef, useEffect } from 'react';
import { 
  TouchableOpacity, 
  StyleSheet, 
  Animated, 
  ViewStyle,
  View
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { getModernShadow } from '@/theme/shadows';
import { moderateScale, rTouchTarget, rs } from '@/utils/responsive';;
import * as Haptics from 'expo-haptics';

interface FloatingActionButtonProps {
  onPress: () => void;
  icon: React.ReactNode;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'success' | 'warning';
  style?: ViewStyle;
  animated?: boolean;
  pulseAnimation?: boolean;
  disabled?: boolean;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  icon,
  position = 'bottom-right',
  size = 'medium',
  variant = 'primary',
  style,
  animated = true,
  pulseAnimation = true,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (animated) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(1);
    }
  }, [animated, scaleAnim]);
  
  useEffect(() => {
    if (pulseAnimation && !disabled) {
      const pulseAnimationLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimationLoop.start();
      
      return () => {
        pulseAnimationLoop.stop();
      };
    }
  }, [pulseAnimation, disabled, pulseAnim]);
  
  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return { width: rTouchTarget.small, height: rTouchTarget.small };
      case 'large':
        return { width: rTouchTarget.large, height: rTouchTarget.large };
      default:
        return { width: rTouchTarget.medium, height: rTouchTarget.medium };
    }
  };
  
  const getPositionStyle = (): ViewStyle => {
    const basePosition: ViewStyle = {
      position: 'absolute',
      bottom: moderateScale(24),
    };
    
    switch (position) {
      case 'bottom-left':
        return { ...basePosition, left: moderateScale(24) };
      case 'bottom-center':
        return { ...basePosition, alignSelf: 'center' };
      default:
        return { ...basePosition, right: moderateScale(24) };
    }
  };
  
  const getGradientColors = () => {
    switch (variant) {
      case 'secondary':
        return [theme.colors.secondary[400], theme.colors.secondary[600]];
      case 'success':
        return [theme.colors.success[400], theme.colors.success[600]];
      case 'warning':
        return [theme.colors.warning[400], theme.colors.warning[600]];
      default:
        return [theme.colors.primary[400], theme.colors.primary[600]];
    }
  };
  
  const handlePress = async () => {
    if (!disabled) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Rotate animation on press
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      
      onPress();
    }
  };
  
  const sizeStyle = getSizeStyle();
  const positionStyle = getPositionStyle();
  
  const animatedStyle = {
    transform: [
      { scale: Animated.multiply(scaleAnim, pulseAnim) },
      {
        rotate: rotateAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '90deg'],
        }),
      },
    ],
    opacity: disabled ? 0.5 : 1,
  };
  
  return (
    <Animated.View
      style={[
        positionStyle,
        style,
        animatedStyle,
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        disabled={disabled}
        style={[sizeStyle, styles.touchable]}
      >
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradient,
            sizeStyle,
            getModernShadow('high'),
          ]}
        >
          {/* Ripple effect background */}
          {pulseAnimation && !disabled && (
            <View style={[StyleSheet.absoluteFillObject, styles.rippleContainer]}>
              <Animated.View
                style={[
                  styles.ripple,
                  {
                    transform: [
                      {
                        scale: pulseAnim.interpolate({
                          inputRange: [1, 1.1],
                          outputRange: [0.8, 1.5],
                        }),
                      },
                    ],
                    opacity: pulseAnim.interpolate({
                      inputRange: [1, 1.1],
                      outputRange: [0.3, 0],
                    }),
                  },
                ]}
              />
            </View>
          )}
          {icon}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  touchable: {
    borderRadius: 100,
  },
  gradient: {
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rippleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
});