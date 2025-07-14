import React, { useRef, useEffect } from 'react';
import { layout, rs } from '@/utils/responsive';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ViewStyle,
  TextStyle,
  LayoutChangeEvent,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';

export type SegmentedControlSize = 'small' | 'medium' | 'large';
export type SegmentedControlVariant = 'default' | 'outline' | 'filled';

export interface SegmentOption {
  value: string;
  label: string;
  icon?: string;
  disabled?: boolean;
}

interface SegmentedControlProps {
  options: SegmentOption[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  size?: SegmentedControlSize;
  variant?: SegmentedControlVariant;
  disabled?: boolean;
  style?: ViewStyle;
  segmentStyle?: ViewStyle;
  selectedSegmentStyle?: ViewStyle;
  textStyle?: TextStyle;
  selectedTextStyle?: TextStyle;
  backgroundColor?: string;
  selectedBackgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  selectedTextColor?: string;
  testID?: string;
  accessibilityLabel?: string;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  selectedValue,
  onValueChange,
  size = 'medium',
  variant = 'default',
  disabled = false,
  style,
  segmentStyle,
  selectedSegmentStyle,
  textStyle,
  selectedTextStyle,
  backgroundColor,
  selectedBackgroundColor,
  borderColor,
  textColor,
  selectedTextColor,
  testID,
  accessibilityLabel,
}) => {
  const { theme } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;
  const segmentWidths = useRef<number[]>([]).current;
  const containerWidth = useRef(0);

  const styles = createStyles(
    theme,
    size,
    variant,
    backgroundColor,
    selectedBackgroundColor,
    borderColor,
    textColor,
    selectedTextColor
  );

  const selectedIndex = options.findIndex((option) => option.value === selectedValue);

  useEffect(() => {
    if (segmentWidths.length === options.length && selectedIndex >= 0) {
      const targetPosition = segmentWidths
        .slice(0, selectedIndex)
        .reduce((sum, width) => sum + width, 0);

      Animated.spring(animatedValue, {
        toValue: targetPosition,
        friction: 8,
        tension: 100,
        useNativeDriver: false,
      }).start();
    }
  }, [selectedIndex, segmentWidths, animatedValue, options.length]);

  const onContainerLayout = (event: LayoutChangeEvent) => {
    containerWidth.current = event.nativeEvent.layout.width;
  };

  const onSegmentLayout = (index: number) => (event: LayoutChangeEvent) => {
    segmentWidths[index] = event.nativeEvent.layout.width;

    // If this is the last segment to measure and we have a selection, animate
    if (segmentWidths.filter(Boolean).length === options.length && selectedIndex >= 0) {
      const targetPosition = segmentWidths
        .slice(0, selectedIndex)
        .reduce((sum, width) => sum + width, 0);
      animatedValue.setValue(targetPosition);
    }
  };

  const handlePress = (option: SegmentOption) => {
    if (disabled || option.disabled || option.value === selectedValue) return;
    onValueChange(option.value);
  };

  const getSelectedSegmentWidth = () => {
    if (selectedIndex >= 0 && segmentWidths[selectedIndex]) {
      return segmentWidths[selectedIndex];
    }
    return containerWidth.current / options.length;
  };

  const renderSegment = (option: SegmentOption, index: number) => {
    const isSelected = option.value === selectedValue;
    const isDisabled = disabled || option.disabled;

    return (
      <TouchableOpacity
        key={option.value}
        style={[
          styles.segment,
          segmentStyle,
          isSelected && selectedSegmentStyle,
          isDisabled && styles.disabledSegment,
        ]}
        onPress={() => handlePress(option)}
        onLayout={onSegmentLayout(index)}
        disabled={isDisabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{
          selected: isSelected,
          disabled: isDisabled,
        }}
        accessibilityLabel={`${option.label}${isSelected ? ', selected' : ''}`}
      >
        <View style={styles.segmentContent}>
          {option.icon && (
            <Text style={[styles.icon, isSelected && styles.selectedIcon]}>{option.icon}</Text>
          )}
          <Text
            style={[
              styles.text,
              textStyle,
              isSelected && styles.selectedText,
              isSelected && selectedTextStyle,
              isDisabled && styles.disabledText,
            ]}
            numberOfLines={1}
          >
            {option.label}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[styles.container, style]}
      onLayout={onContainerLayout}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="tablist"
    >
      {/* Animated background for selected segment */}
      <Animated.View
        style={[
          styles.selectedBackground,
          {
            left: animatedValue,
            width: getSelectedSegmentWidth(),
          },
        ]}
      />

      {/* Segments */}
      {options.map((option, index) => renderSegment(option, index))}
    </View>
  );
};

const createStyles = (
  theme: Theme,
  size: SegmentedControlSize,
  variant: SegmentedControlVariant,
  backgroundColor?: string,
  selectedBackgroundColor?: string,
  borderColor?: string,
  textColor?: string,
  selectedTextColor?: string
) => {
  const sizeConfig = {
    small: {
      height: 32,
      fontSize: 13,
      iconSize: 14,
      paddingHorizontal: 12,
      borderRadius: 6,
    },
    medium: {
      height: 40,
      fontSize: 14,
      iconSize: 16,
      paddingHorizontal: 16,
      borderRadius: 8,
    },
    large: {
      height: 48,
      fontSize: 16,
      iconSize: 18,
      paddingHorizontal: 20,
      borderRadius: 10,
    },
  }[size];

  const variantConfig = {
    default: {
      containerBackground: backgroundColor || theme.colors.neutral[100],
      selectedBackground: selectedBackgroundColor || theme.colors.primary[500],
      borderColor: borderColor || theme.colors.neutral[200],
      textColor: textColor || theme.colors.text.secondary,
      selectedTextColor: selectedTextColor || theme.colors.neutral[100],
    },
    outline: {
      containerBackground: backgroundColor || 'transparent',
      selectedBackground: selectedBackgroundColor || theme.colors.primary[500],
      borderColor: borderColor || theme.colors.primary[500],
      textColor: textColor || theme.colors.primary[500],
      selectedTextColor: selectedTextColor || theme.colors.neutral[100],
    },
    filled: {
      containerBackground: backgroundColor || theme.colors.primary[100],
      selectedBackground: selectedBackgroundColor || theme.colors.primary[500],
      borderColor: borderColor || theme.colors.primary[200],
      textColor: textColor || theme.colors.primary[600],
      selectedTextColor: selectedTextColor || theme.colors.neutral[100],
    },
  }[variant];

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: variantConfig.containerBackground,
      borderRadius: sizeConfig.borderRadius,
      borderWidth: 1,
      borderColor: variantConfig.borderColor,
      padding: 2,
      position: 'relative',
      overflow: 'hidden',
    },
    selectedBackground: {
      position: 'absolute',
      top: 2,
      bottom: 2,
      backgroundColor: variantConfig.selectedBackground,
      borderRadius: sizeConfig.borderRadius - 2,
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    segment: {
      flex: 1,
      height: sizeConfig.height - 4,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: sizeConfig.paddingHorizontal,
      zIndex: 1,
    },
    segmentContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      fontSize: sizeConfig.fontSize,
      fontWeight: '500',
      color: variantConfig.textColor,
      textAlign: 'center',
    },
    selectedText: {
      color: variantConfig.selectedTextColor,
      fontWeight: '600',
    },
    icon: {
      fontSize: sizeConfig.iconSize,
      marginRight: 4,
      color: variantConfig.textColor,
    },
    selectedIcon: {
      color: variantConfig.selectedTextColor,
    },
    disabledSegment: {
      opacity: 0.5,
    },
    disabledText: {
      color: theme.colors.text.disabled,
    },
  });
};
