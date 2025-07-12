import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';

export interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
  description?: string;
}

interface RadioGroupProps {
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  error?: boolean;
  errorMessage?: string;
  label?: string;
  required?: boolean;
  style?: ViewStyle;
  labelStyle?: TextStyle;
  optionStyle?: ViewStyle;
  testID?: string;
  accessibilityLabel?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  options,
  value,
  onChange,
  orientation = 'vertical',
  size = 'medium',
  disabled = false,
  error = false,
  errorMessage,
  label,
  required = false,
  style,
  labelStyle,
  optionStyle,
  testID,
  accessibilityLabel,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const handlePress = (optionValue: string) => {
    if (!disabled) {
      onChange?.(optionValue);
    }
  };

  const renderRadioButton = (option: RadioOption) => {
    const isSelected = value === option.value;
    const isDisabled = disabled || option.disabled;

    const radioSize = size === 'small' ? 16 : size === 'medium' ? 20 : 24;
    const dotSize = size === 'small' ? 8 : size === 'medium' ? 10 : 12;

    return (
      <TouchableOpacity
        key={option.value}
        style={[
          styles.option,
          orientation === 'horizontal' && styles.horizontalOption,
          optionStyle,
        ]}
        onPress={() => handlePress(option.value)}
        disabled={isDisabled}
        activeOpacity={0.7}
        testID={`${testID}-option-${option.value}`}
        accessibilityRole="radio"
        accessibilityState={{
          checked: isSelected,
          disabled: isDisabled,
        }}
        accessibilityLabel={option.label}
        accessibilityHint={option.description}
      >
        <View
          style={[
            styles.radio,
            styles[`${size}Radio`],
            isSelected && styles.radioSelected,
            error && styles.radioError,
            isDisabled && styles.radioDisabled,
          ]}
        >
          {isSelected && (
            <View
              style={[
                styles.radioDot,
                { width: dotSize, height: dotSize },
                isDisabled && styles.radioDotDisabled,
              ]}
            />
          )}
        </View>
        <View style={styles.labelContainer}>
          <Text
            style={[
              styles.optionLabel,
              styles[`${size}Label`],
              isDisabled && styles.disabledLabel,
            ]}
          >
            {option.label}
          </Text>
          {option.description && (
            <Text
              style={[
                styles.description,
                styles[`${size}Description`],
                isDisabled && styles.disabledLabel,
              ]}
            >
              {option.description}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={style} testID={testID}>
      {label && (
        <Text
          style={[styles.groupLabel, labelStyle]}
          accessibilityRole="text"
        >
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <View
        style={[
          styles.container,
          orientation === 'horizontal' && styles.horizontalContainer,
        ]}
        accessibilityRole="radiogroup"
        accessibilityLabel={accessibilityLabel || label}
      >
        {options.map(renderRadioButton)}
      </View>
      {error && errorMessage && (
        <Text style={styles.errorMessage} accessibilityRole="alert">
          {errorMessage}
        </Text>
      )}
    </View>
  );
};

// Single Radio component for custom implementations
interface RadioProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  label?: string;
  style?: ViewStyle;
  labelStyle?: TextStyle;
  testID?: string;
}

export const Radio: React.FC<RadioProps> = ({
  checked = false,
  onChange,
  disabled = false,
  size = 'medium',
  label,
  style,
  labelStyle,
  testID,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const radioSize = size === 'small' ? 16 : size === 'medium' ? 20 : 24;
  const dotSize = size === 'small' ? 8 : size === 'medium' ? 10 : 12;

  return (
    <TouchableOpacity
      style={[styles.option, style]}
      onPress={() => onChange?.(!checked)}
      disabled={disabled}
      activeOpacity={0.7}
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{
        checked,
        disabled,
      }}
      accessibilityLabel={label}
    >
      <View
        style={[
          styles.radio,
          styles[`${size}Radio`],
          checked && styles.radioSelected,
          disabled && styles.radioDisabled,
        ]}
      >
        {checked && (
          <View
            style={[
              styles.radioDot,
              { width: dotSize, height: dotSize },
              disabled && styles.radioDotDisabled,
            ]}
          />
        )}
      </View>
      {label && (
        <Text
          style={[
            styles.optionLabel,
            styles[`${size}Label`],
            disabled && styles.disabledLabel,
            labelStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'column',
    },
    horizontalContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    groupLabel: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.medium,
      fontWeight: '500',
      color: theme.colors.neutral[800],
      marginBottom: theme.spacing.s,
    },
    required: {
      color: theme.colors.error[500],
    },
    option: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.s,
    },
    horizontalOption: {
      marginRight: theme.spacing.l,
      marginBottom: theme.spacing.s,
    },
    radio: {
      borderWidth: 2,
      borderColor: theme.colors.neutral[400],
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
    },
    radioSelected: {
      borderColor: theme.colors.primary[500],
    },
    radioError: {
      borderColor: theme.colors.error[500],
    },
    radioDisabled: {
      borderColor: theme.colors.neutral[300],
      backgroundColor: theme.colors.neutral[100],
    },
    radioDot: {
      borderRadius: 999,
      backgroundColor: theme.colors.primary[500],
    },
    radioDotDisabled: {
      backgroundColor: theme.colors.neutral[400],
    },
    // Sizes
    smallRadio: {
      width: 16,
      height: 16,
    },
    mediumRadio: {
      width: 20,
      height: 20,
    },
    largeRadio: {
      width: 24,
      height: 24,
    },
    labelContainer: {
      flex: 1,
      marginLeft: theme.spacing.s,
    },
    optionLabel: {
      color: theme.colors.neutral[800],
      fontFamily: theme.typography.fontFamily.regular,
    },
    smallLabel: {
      fontSize: theme.typography.fontSize.sm,
    },
    mediumLabel: {
      fontSize: theme.typography.fontSize.base,
    },
    largeLabel: {
      fontSize: theme.typography.fontSize.lg,
    },
    description: {
      color: theme.colors.neutral[600],
      fontFamily: theme.typography.fontFamily.regular,
      marginTop: theme.spacing.xxs,
    },
    smallDescription: {
      fontSize: theme.typography.fontSize.xs,
    },
    mediumDescription: {
      fontSize: theme.typography.fontSize.sm,
    },
    largeDescription: {
      fontSize: theme.typography.fontSize.base,
    },
    disabledLabel: {
      color: theme.colors.neutral[400],
    },
    errorMessage: {
      color: theme.colors.error[500],
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.regular,
      marginTop: theme.spacing.xs,
    },
  });

export default RadioGroup;