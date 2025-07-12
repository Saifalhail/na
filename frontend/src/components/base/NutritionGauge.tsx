import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';

export type NutritionGaugeSize = 'small' | 'medium' | 'large';

export interface NutritionGaugeProps {
  value: number; // Current value (0-100)
  maxValue?: number; // Maximum value for the gauge
  minValue?: number; // Minimum value for the gauge
  label?: string; // Label text (e.g., "Calories", "Protein")
  unit?: string; // Unit text (e.g., "kcal", "g")
  size?: NutritionGaugeSize;
  color?: string; // Primary color for the gauge
  backgroundColor?: string; // Background color for the track
  strokeWidth?: number; // Width of the gauge stroke
  animated?: boolean; // Whether to animate value changes
  animationDuration?: number; // Animation duration in ms
  showValue?: boolean; // Whether to show the numeric value
  showPercentage?: boolean; // Whether to show percentage instead of value
  style?: ViewStyle;
  labelStyle?: TextStyle;
  valueStyle?: TextStyle;
  testID?: string;
  accessibilityLabel?: string;
}

export const NutritionGauge: React.FC<NutritionGaugeProps> = ({
  value,
  maxValue = 100,
  minValue = 0,
  label,
  unit,
  size = 'medium',
  color,
  backgroundColor,
  strokeWidth,
  animated = true,
  animationDuration = 1000,
  showValue = true,
  showPercentage = false,
  style,
  labelStyle,
  valueStyle,
  testID,
  accessibilityLabel,
}) => {
  const { theme } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  const sizeConfig = {
    small: {
      containerSize: 80,
      strokeWidth: strokeWidth || 6,
      valueTextSize: 14,
      labelTextSize: 10,
    },
    medium: {
      containerSize: 120,
      strokeWidth: strokeWidth || 8,
      valueTextSize: 18,
      labelTextSize: 12,
    },
    large: {
      containerSize: 160,
      strokeWidth: strokeWidth || 10,
      valueTextSize: 24,
      labelTextSize: 14,
    },
  }[size];
  
  const styles = createStyles(theme, size, strokeWidth);
  
  // Calculate the normalized value (0-1)
  const normalizedValue = Math.max(0, Math.min(1, (value - minValue) / (maxValue - minValue)));
  
  // Calculate the rotation angle (0-270 degrees for 3/4 circle)
  const rotationAngle = normalizedValue * 270;
  
  useEffect(() => {
    if (animated) {
      Animated.timing(animatedValue, {
        toValue: rotationAngle,
        duration: animationDuration,
        useNativeDriver: false,
      }).start();
    } else {
      animatedValue.setValue(rotationAngle);
    }
  }, [rotationAngle, animated, animationDuration, animatedValue]);

  const gaugeColor = color || theme.colors.primary[500];
  const trackColor = backgroundColor || theme.colors.neutral[200];
  const radius = (styles.container.width as number) / 2 - sizeConfig.strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = (circumference * 3) / 4; // 3/4 of the circle
  
  // Calculate the stroke dash offset for the progress (not used in current implementation)
  // const strokeDashoffset = strokeDasharray - (strokeDasharray * normalizedValue);

  const displayValue = showPercentage 
    ? `${Math.round(normalizedValue * 100)}%`
    : `${Math.round(value)}${unit ? ` ${unit}` : ''}`;

  const getAccessibilityValue = () => {
    const percentage = Math.round(normalizedValue * 100);
    return {
      min: minValue,
      max: maxValue,
      now: value,
      text: `${percentage}% ${label ? `of ${label}` : ''}`,
    };
  };

  return (
    <View
      style={[styles.container, style]}
      testID={testID}
      accessibilityLabel={accessibilityLabel || `${label} gauge`}
      accessibilityRole="progressbar"
      accessibilityValue={getAccessibilityValue()}
    >
      {/* Background Track */}
      <View style={styles.gaugeContainer}>
        <View
          style={[
            styles.gauge,
            styles.trackGauge,
            {
              borderColor: trackColor,
              borderTopColor: 'transparent',
            },
          ]}
        />
        
        {/* Animated Progress */}
        <Animated.View
          style={[
            styles.gauge,
            styles.progressGauge,
            {
              borderColor: gaugeColor,
              borderTopColor: 'transparent',
              transform: [{
                rotate: animatedValue.interpolate({
                  inputRange: [0, 270],
                  outputRange: ['135deg', '405deg'], // Start from bottom-left
                })
              }],
            },
          ]}
        />
        
        {/* Center content */}
        <View style={styles.centerContent}>
          {showValue && (
            <Text style={[styles.valueText, valueStyle]} numberOfLines={1}>
              {displayValue}
            </Text>
          )}
          {label && (
            <Text style={[styles.labelText, labelStyle]} numberOfLines={1}>
              {label}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const createStyles = (
  theme: Theme,
  size: NutritionGaugeSize,
  customStrokeWidth?: number
) => {
  const sizeConfig = {
    small: {
      containerSize: 80,
      strokeWidth: customStrokeWidth || 6,
      valueTextSize: 14,
      labelTextSize: 10,
    },
    medium: {
      containerSize: 120,
      strokeWidth: customStrokeWidth || 8,
      valueTextSize: 18,
      labelTextSize: 12,
    },
    large: {
      containerSize: 160,
      strokeWidth: customStrokeWidth || 10,
      valueTextSize: 24,
      labelTextSize: 14,
    },
  }[size];

  return StyleSheet.create({
    container: {
      width: sizeConfig.containerSize,
      height: sizeConfig.containerSize,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gaugeContainer: {
      width: '100%',
      height: '100%',
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
    },
    gauge: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      borderRadius: sizeConfig.containerSize / 2,
      borderWidth: sizeConfig.strokeWidth,
      borderTopColor: 'transparent',
      borderRightColor: 'transparent',
      borderBottomColor: 'transparent',
      borderLeftColor: 'transparent',
    },
    trackGauge: {
      borderTopColor: 'transparent',
      transform: [{ rotate: '135deg' }],
    },
    progressGauge: {
      borderTopColor: 'transparent',
    },
    centerContent: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
      top: '50%',
      left: '50%',
      transform: [
        { translateX: -(sizeConfig.containerSize * 0.3) / 2 },
        { translateY: -(sizeConfig.containerSize * 0.3) / 2 },
      ],
      width: sizeConfig.containerSize * 0.6,
      height: sizeConfig.containerSize * 0.6,
    },
    valueText: {
      fontSize: sizeConfig.valueTextSize,
      fontWeight: '600',
      color: theme.colors.text.primary,
      textAlign: 'center',
      marginBottom: 2,
    },
    labelText: {
      fontSize: sizeConfig.labelTextSize,
      fontWeight: '400',
      color: theme.colors.text.secondary,
      textAlign: 'center',
    },
  });
};