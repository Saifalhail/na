import React, { useEffect, useRef } from 'react';
import { rs } from '@/utils/responsive';
import { View, Text, StyleSheet, ViewStyle, TextStyle, Animated, Easing } from 'react-native';
import Svg, { Circle, G, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showLabel?: boolean;
  label?: string;
  labelStyle?: TextStyle;
  animated?: boolean;
  animationDuration?: number;
  startAngle?: number; // Starting angle in degrees (0 = top)
  style?: ViewStyle;
  children?: React.ReactNode;
  testID?: string;
  // Premium enhancements
  gradient?: boolean;
  gradientColors?: readonly [string, string, ...string[]];
  pulseEffect?: boolean;
  springAnimation?: boolean;
  glowEffect?: boolean;
  animationType?: 'linear' | 'easeOut' | 'easeInOut' | 'bounce' | 'spring';
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 120,
  strokeWidth = 12,
  color,
  backgroundColor,
  showLabel = true,
  label,
  labelStyle,
  animated = true,
  animationDuration = 1000,
  startAngle = -90, // Start from top
  style,
  children,
  testID,
  // Premium enhancements
  gradient = false,
  gradientColors,
  pulseEffect = false,
  springAnimation = false,
  glowEffect = false,
  animationType = 'easeOut',
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const animatedValue = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;
  // Fix precision error by rounding circumference calculation
  const circumference = Math.round(radius * 2 * Math.PI * 100) / 100;

  const progressColor = color || theme.colors.primary[500];
  const bgColor = backgroundColor || theme.colors.neutral[200];

  // Clamp progress between 0 and 100 and round to prevent precision errors
  const clampedProgress = Math.round(Math.max(0, Math.min(100, progress)) * 100) / 100;

  // Get animation configuration based on type
  const getAnimationConfig = () => {
    const baseConfig = {
      toValue: clampedProgress,
      useNativeDriver: false,
    };

    if (springAnimation) {
      return {
        ...baseConfig,
        tension: 50,
        friction: 7,
      };
    }

    const easingMap = {
      linear: Easing.linear,
      easeOut: Easing.out(Easing.ease),
      easeInOut: Easing.inOut(Easing.ease),
      bounce: Easing.bounce,
      spring: Easing.elastic(1),
    };

    return {
      ...baseConfig,
      duration: animationDuration,
      easing: easingMap[animationType],
    };
  };

  // Main progress animation
  useEffect(() => {
    if (animated) {
      const animationRunner = springAnimation ? Animated.spring : Animated.timing;
      animationRunner(animatedValue, getAnimationConfig()).start();
    } else {
      animatedValue.setValue(clampedProgress);
    }
  }, [clampedProgress, animated, animationDuration, springAnimation, animationType]);

  // Pulse effect animation
  useEffect(() => {
    if (pulseEffect && animated) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      );
      pulseAnimation.start();

      return () => {
        pulseAnimation.stop();
        pulseAnim.setValue(1);
      };
    }
    return undefined;
  }, [pulseEffect, animated, pulseAnim]);

  // Glow effect animation
  useEffect(() => {
    if (glowEffect && animated) {
      const glowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      );
      glowAnimation.start();

      return () => {
        glowAnimation.stop();
        glowAnim.setValue(0);
      };
    }
    return undefined;
  }, [glowEffect, animated, glowAnim]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [Math.round(circumference * 100) / 100, 0],
    extrapolate: 'clamp',
  });

  // Get gradient colors or use fallback
  const getGradientColors = (): readonly [string, string, ...string[]] => {
    if (gradientColors && gradientColors.length >= 2) {
      return gradientColors;
    }
    // Default gradient based on theme
    return [
      progressColor,
      theme.isDark ? theme.colors.primary[400] : theme.colors.primary[700],
    ] as const;
  };

  // Calculate glow opacity
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
    extrapolate: 'clamp',
  });

  const renderLabel = () => {
    if (!showLabel) return null;

    if (children) {
      return <View style={styles.labelContainer}>{children}</View>;
    }

    return (
      <View style={styles.labelContainer}>
        <Text style={[styles.progressText, labelStyle]}>
          {label || `${Math.round(clampedProgress)}%`}
        </Text>
      </View>
    );
  };

  const strokeId = `progress-gradient-${Date.now()}`;
  const glowId = `progress-glow-${Date.now()}`;
  const colors = getGradientColors();

  return (
    <Animated.View
      style={[
        styles.container, 
        { width: size, height: size },
        pulseEffect && { transform: [{ scale: pulseAnim }] },
        style
      ]}
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: clampedProgress,
      }}
      accessibilityLabel={`Progress: ${Math.round(clampedProgress)}%`}
    >
      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          {/* Gradient definition for progress stroke */}
          {gradient && (
            <SvgLinearGradient id={strokeId} x1="0%" y1="0%" x2="100%" y2="100%">
              {colors.map((color, index) => (
                <Stop
                  key={index}
                  offset={`${(index / (colors.length - 1)) * 100}%`}
                  stopColor={color}
                />
              ))}
            </SvgLinearGradient>
          )}

          {/* Glow filter definition */}
          {glowEffect && (
            <SvgLinearGradient id={glowId} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={progressColor} stopOpacity="0" />
              <Stop offset="50%" stopColor={progressColor} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={progressColor} stopOpacity="0" />
            </SvgLinearGradient>
          )}
        </Defs>

        <G rotation={startAngle} origin={`${size / 2}, ${size / 2}`}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={bgColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />

          {/* Glow effect background (if enabled) */}
          {glowEffect && (
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={`url(#${glowId})`}
              strokeWidth={strokeWidth + 4}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              opacity={glowOpacity}
            />
          )}

          {/* Progress circle */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={gradient ? `url(#${strokeId})` : progressColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
          />
        </G>
      </Svg>

      {renderLabel()}
    </Animated.View>
  );
};

// Helper component for multi-ring progress
interface MultiProgressRingProps {
  rings: Array<{
    progress: number;
    color: string;
    label?: string;
  }>;
  size?: number;
  strokeWidth?: number;
  animated?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export const MultiProgressRing: React.FC<MultiProgressRingProps> = ({
  rings,
  size = 160,
  strokeWidth = 8,
  animated = true,
  style,
  testID,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const gap = strokeWidth + 4;

  return (
    <View style={[styles.multiContainer, { width: size, height: size }, style]} testID={testID}>
      {rings.map((ring, index) => {
        const ringSize = size - index * gap * 2;
        const offset = index * gap;

        return (
          <View
            key={index}
            style={[
              styles.ringWrapper,
              {
                position: 'absolute',
                top: offset,
                left: offset,
              },
            ]}
          >
            <ProgressRing
              progress={ring.progress}
              size={ringSize}
              strokeWidth={strokeWidth}
              color={ring.color}
              showLabel={false}
              animated={animated}
              animationDuration={1000 + index * 200}
            />
          </View>
        );
      })}

      <View style={styles.multiLabelContainer}>
        {rings.map(
          (ring, index) =>
            ring.label && (
              <View key={index} style={styles.multiLabel}>
                <View style={[styles.multiLabelDot, { backgroundColor: ring.color }]} />
                <Text style={styles.multiLabelText}>
                  {ring.label}: {Math.round(ring.progress)}%
                </Text>
              </View>
            )
        )}
      </View>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    svg: {
      transform: [{ rotateZ: '0deg' }],
    },
    labelContainer: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressText: {
      fontSize: theme.typography.fontSize.xl,
      fontFamily: theme.typography.fontFamily.bold,
      fontWeight: '700',
      color: theme.colors.text.primary,
    },
    multiContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    ringWrapper: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    multiLabelContainer: {
      position: 'absolute',
      bottom: -40,
      left: 0,
      right: 0,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
    },
    multiLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    multiLabelDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    multiLabelText: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.text.secondary,
    },
  });

export default ProgressRing;
