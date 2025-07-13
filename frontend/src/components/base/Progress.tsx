import React, { useEffect, useRef } from 'react';
import { borderRadius, rs } from '@/utils/responsive';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Animated,
  Platform,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';

export type ProgressVariant = 'linear' | 'circular';
export type ProgressSize = 'small' | 'medium' | 'large';

interface ProgressProps {
  value: number;
  max?: number;
  variant?: ProgressVariant;
  size?: ProgressSize;
  color?: string;
  backgroundColor?: string;
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  indeterminate?: boolean;
  thickness?: number;
  style?: ViewStyle;
  labelStyle?: TextStyle;
  testID?: string;
  accessibilityLabel?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  variant = 'linear',
  size = 'medium',
  color,
  backgroundColor,
  showLabel = false,
  label,
  animated = true,
  indeterminate = false,
  thickness,
  style,
  labelStyle,
  testID,
  accessibilityLabel,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const indeterminateAnimation = useRef(new Animated.Value(0)).current;

  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const progressColor = color || theme.colors.primary[500];
  const bgColor = backgroundColor || theme.colors.neutral[200];

  useEffect(() => {
    if (!indeterminate && animated) {
      Animated.timing(animatedValue, {
        toValue: percentage,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [percentage, indeterminate, animated]);

  useEffect(() => {
    if (indeterminate) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(indeterminateAnimation, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(indeterminateAnimation, {
            toValue: 0,
            duration: 0,
            useNativeDriver: false,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
    return () => {}; // Return cleanup function for all paths
  }, [indeterminate]);

  const getThickness = () => {
    if (thickness) return thickness;
    return size === 'small' ? 4 : size === 'medium' ? 8 : 12;
  };

  const renderLinearProgress = () => {
    const barHeight = getThickness();
    const containerStyle = [
      styles.linearContainer,
      { height: barHeight, backgroundColor: bgColor },
      style,
    ].filter(Boolean) as ViewStyle[];

    const progressWidth = indeterminate
      ? indeterminateAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: ['20%', '100%'],
        })
      : animated
      ? animatedValue.interpolate({
          inputRange: [0, 100],
          outputRange: ['0%', '100%'],
        })
      : `${percentage}%`;

    const progressTranslate = indeterminate
      ? indeterminateAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 200],
        })
      : 0;

    return (
      <View style={styles.progressContainer}>
        <View style={containerStyle}>
          <Animated.View
            style={[
              styles.linearProgress,
              {
                width: progressWidth as any,
                backgroundColor: progressColor,
                transform: [{ translateX: progressTranslate }],
              },
            ]}
          />
        </View>
        {showLabel && (
          <Text style={[styles.label, styles[`${size}Label`], labelStyle]}>
            {label || `${Math.round(percentage)}%`}
          </Text>
        )}
      </View>
    );
  };

  const renderCircularProgress = () => {
    const circleSize = size === 'small' ? 40 : size === 'medium' ? 60 : 80;
    const strokeWidth = getThickness();
    const radius = (circleSize - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = indeterminate
      ? 0
      : circumference - (percentage / 100) * circumference;

    // For React Native, we'll use a simple view-based circular progress
    return (
      <View
        style={[
          styles.circularContainer,
          {
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
            borderWidth: strokeWidth,
            borderColor: bgColor,
          },
          style,
        ]}
      >
        <View
          style={[
            styles.circularProgress,
            {
              width: circleSize - strokeWidth * 2,
              height: circleSize - strokeWidth * 2,
              borderRadius: (circleSize - strokeWidth * 2) / 2,
              borderWidth: strokeWidth,
              borderColor: progressColor,
              borderTopColor: 'transparent',
              borderRightColor: percentage > 25 ? progressColor : 'transparent',
              borderBottomColor: percentage > 50 ? progressColor : 'transparent',
              borderLeftColor: percentage > 75 ? progressColor : 'transparent',
              transform: [{ rotate: `${(percentage / 100) * 360}deg` }],
            },
          ]}
        />
        {showLabel && (
          <View style={styles.circularLabelContainer}>
            <Text style={[styles.label, styles[`${size}Label`], labelStyle]}>
              {label || `${Math.round(percentage)}%`}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const defaultAccessibilityLabel = `Progress: ${Math.round(percentage)}%`;

  return (
    <View
      testID={testID || `progress-${variant}`}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: max,
        now: value,
      }}
      accessibilityLabel={accessibilityLabel || defaultAccessibilityLabel}
    >
      {variant === 'linear' ? renderLinearProgress() : renderCircularProgress()}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    progressContainer: {
      width: '100%',
    },
    linearContainer: {
      width: '100%',
      borderRadius: theme.borderRadius.full,
      overflow: 'hidden',
      backgroundColor: theme.colors.neutral[200],
    },
    linearProgress: {
      height: '100%',
      borderRadius: theme.borderRadius.full,
    },
    circularContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    circularProgress: {
      position: 'absolute',
    },
    circularLabelContainer: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      fontFamily: theme.typography.fontFamily.medium,
      fontWeight: '500',
      color: theme.colors.neutral[700],
      marginTop: theme.spacing.xs,
    },
    smallLabel: {
      fontSize: theme.typography.fontSize.xs,
    },
    mediumLabel: {
      fontSize: theme.typography.fontSize.sm,
    },
    largeLabel: {
      fontSize: theme.typography.fontSize.base,
    },
  });

export default Progress;