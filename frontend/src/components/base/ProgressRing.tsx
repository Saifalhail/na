import React, { useEffect, useRef } from 'react';
import { rs } from '@/utils/responsive';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Animated,
} from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
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
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  
  const animatedValue = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;
  // Fix precision error by rounding circumference calculation
  const circumference = Math.round(radius * 2 * Math.PI * 100) / 100;
  
  const progressColor = color || theme.colors.primary[500];
  const bgColor = backgroundColor || theme.colors.neutral[200];
  
  // Clamp progress between 0 and 100 and round to prevent precision errors
  const clampedProgress = Math.round(Math.max(0, Math.min(100, progress)) * 100) / 100;
  
  useEffect(() => {
    if (animated) {
      Animated.timing(animatedValue, {
        toValue: clampedProgress,
        duration: animationDuration,
        useNativeDriver: false,
      }).start();
    } else {
      animatedValue.setValue(clampedProgress);
    }
  }, [clampedProgress, animated, animationDuration]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [Math.round(circumference * 100) / 100, 0],
    extrapolate: 'clamp',
  });

  const rotation = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: ['0deg', '360deg'],
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

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size },
        style,
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
      <Svg
        width={size}
        height={size}
        style={styles.svg}
      >
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
          
          {/* Progress circle */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={progressColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
          />
        </G>
      </Svg>
      
      {renderLabel()}
    </View>
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
    <View
      style={[
        styles.multiContainer,
        { width: size, height: size },
        style,
      ]}
      testID={testID}
    >
      {rings.map((ring, index) => {
        const ringSize = size - (index * gap * 2);
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
              animationDuration={1000 + (index * 200)}
            />
          </View>
        );
      })}
      
      <View style={styles.multiLabelContainer}>
        {rings.map((ring, index) => (
          ring.label && (
            <View key={index} style={styles.multiLabel}>
              <View
                style={[
                  styles.multiLabelDot,
                  { backgroundColor: ring.color },
                ]}
              />
              <Text style={styles.multiLabelText}>
                {ring.label}: {Math.round(ring.progress)}%
              </Text>
            </View>
          )
        ))}
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