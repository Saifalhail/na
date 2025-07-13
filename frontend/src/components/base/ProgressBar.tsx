import React, { useEffect, useRef } from 'react';
import { rs } from '@/utils/responsive';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Animated,
  AccessibilityRole,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';

type ProgressBarVariant = 'default' | 'success' | 'warning' | 'error';
type ProgressBarSize = 'small' | 'medium' | 'large';

interface ProgressBarProps {
  progress: number; // 0-100
  variant?: ProgressBarVariant;
  size?: ProgressBarSize;
  label?: string;
  showPercentage?: boolean;
  animated?: boolean;
  animationDuration?: number;
  striped?: boolean;
  stripedAnimated?: boolean;
  style?: ViewStyle;
  barStyle?: ViewStyle;
  labelStyle?: TextStyle;
  testID?: string;
  accessibilityLabel?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  variant = 'default',
  size = 'medium',
  label,
  showPercentage = false,
  animated = true,
  animationDuration = 300,
  striped = false,
  stripedAnimated = false,
  style,
  barStyle,
  labelStyle,
  testID,
  accessibilityLabel,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const animatedWidth = useRef(new Animated.Value(0)).current;

  // Clamp progress between 0 and 100
  const clampedProgress = Math.max(0, Math.min(100, progress));

  useEffect(() => {
    if (animated) {
      Animated.timing(animatedWidth, {
        toValue: clampedProgress,
        duration: animationDuration,
        useNativeDriver: false,
      }).start();
    } else {
      animatedWidth.setValue(clampedProgress);
    }
  }, [clampedProgress, animated, animationDuration, animatedWidth]);

  const getVariantColor = () => {
    switch (variant) {
      case 'success':
        return theme.colors.success[500];
      case 'warning':
        return theme.colors.warning[500];
      case 'error':
        return theme.colors.error[500];
      default:
        return theme.colors.primary[500];
    }
  };

  const getHeightBySize = () => {
    switch (size) {
      case 'small':
        return 4;
      case 'large':
        return 12;
      default:
        return 8;
    }
  };

  const renderLabel = () => {
    if (!label && !showPercentage) return null;

    const labelText = label || '';
    const percentageText = showPercentage ? `${Math.round(clampedProgress)}%` : '';
    const displayText = [labelText, percentageText].filter(Boolean).join(' - ');

    return (
      <Text style={[styles.label, labelStyle, { color: theme.colors.text.primary }]}>
        {displayText}
      </Text>
    );
  };

  const barHeight = getHeightBySize();
  const barColor = getVariantColor();

  return (
    <View style={[styles.container, style]} testID={testID}>
      {renderLabel()}
      <View
        style={[
          styles.track,
          {
            height: barHeight,
            backgroundColor: theme.colors.neutral[200],
          },
        ]}
        accessibilityRole={'progressbar' as AccessibilityRole}
        accessibilityValue={{
          min: 0,
          max: 100,
          now: clampedProgress,
        }}
        accessibilityLabel={
          accessibilityLabel || `Progress: ${Math.round(clampedProgress)}%`
        }
      >
        <Animated.View
          style={[
            styles.bar,
            {
              backgroundColor: barColor,
              width: animatedWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
            barStyle,
          ]}
        >
          {striped && (
            <View style={[styles.stripes, stripedAnimated && styles.stripedAnimated]} />
          )}
        </Animated.View>
      </View>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      width: '100%',
    },
    label: {
      fontSize: 14,
      marginBottom: 4,
    },
    track: {
      width: '100%',
      borderRadius: 4,
      overflow: 'hidden',
    },
    bar: {
      height: '100%',
      borderRadius: 4,
    },
    stripes: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      opacity: 0.2,
    },
    stripedAnimated: {
      // Add striped animation if needed
    },
  });