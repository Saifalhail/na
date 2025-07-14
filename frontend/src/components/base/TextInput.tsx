import React, { useState, forwardRef, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  Animated,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';
import { spacing, layout } from '@/theme/spacing';
import { textPresets } from '@/theme/typography';
import { getModernShadow } from '@/theme/shadows';

export type TextInputVariant = 'outlined' | 'filled' | 'underlined' | 'floating';
export type TextInputSize = 'small' | 'medium' | 'large';

interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  variant?: TextInputVariant;
  size?: TextInputSize;
  floatingLabel?: boolean;
  animated?: boolean;
  success?: boolean;
  disabled?: boolean;
}

export const TextInput = forwardRef<RNTextInput, TextInputProps>(
  (
    {
      label,
      error,
      hint,
      required = false,
      leftIcon,
      rightIcon,
      onRightIconPress,
      containerStyle,
      inputStyle,
      variant = 'outlined',
      size = 'medium',
      floatingLabel = false,
      animated = true,
      success = false,
      disabled = false,
      value,
      ...props
    },
    ref
  ) => {
    const { theme } = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(!!value);
    const labelAnimation = useRef(new Animated.Value(hasValue || isFocused ? 1 : 0)).current;
    const styles = createStyles(theme);

    const hasError = !!error;
    const isDisabled = disabled || props.editable === false;
    const shouldFloatLabel = floatingLabel && (isFocused || hasValue);

    useEffect(() => {
      setHasValue(!!value);
    }, [value]);

    useEffect(() => {
      if (animated && floatingLabel) {
        Animated.timing(labelAnimation, {
          toValue: shouldFloatLabel ? 1 : 0,
          duration: 200,
          useNativeDriver: false,
        }).start();
      }
    }, [shouldFloatLabel, animated, floatingLabel, labelAnimation]);

    const handleFocus = (e: any) => {
      setIsFocused(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      props.onBlur?.(e);
    };

    const handleChangeText = (text: string) => {
      setHasValue(!!text);
      props.onChangeText?.(text);
    };

    const inputContainerStyle: ViewStyle[] = [
      styles.inputContainer,
      styles[variant],
      styles[`${size}Size`],
      isFocused && styles.focused,
      hasError && styles.error,
      success && !hasError && styles.success,
      isDisabled && styles.disabled,
    ].filter(Boolean);

    const labelStyle = floatingLabel
      ? [
          styles.floatingLabel,
          {
            transform: [
              {
                translateY: labelAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -spacing['6']],
                }),
              },
              {
                scale: labelAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0.85],
                }),
              },
            ],
          },
        ]
      : styles.label;

    return (
      <View style={[styles.container, containerStyle]}>
        {label && !floatingLabel && (
          <Text style={labelStyle}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        )}

        <View style={inputContainerStyle}>
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

          <View style={styles.inputWrapper}>
            {floatingLabel && label && (
              <Animated.Text style={labelStyle}>
                {label}
                {required && <Text style={styles.required}> *</Text>}
              </Animated.Text>
            )}

            <RNTextInput
              ref={ref}
              style={[styles.input, styles[`${size}Input`], inputStyle]}
              placeholderTextColor={theme.colors.text.disabled}
              value={value}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onChangeText={handleChangeText}
              editable={!isDisabled}
              {...props}
            />
          </View>

          {rightIcon && (
            <TouchableOpacity
              style={styles.rightIcon}
              onPress={onRightIconPress}
              disabled={!onRightIconPress || isDisabled}
            >
              {rightIcon}
            </TouchableOpacity>
          )}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}
        {hint && !error && <Text style={styles.hintText}>{hint}</Text>}
      </View>
    );
  }
);

TextInput.displayName = 'TextInput';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginBottom: spacing['4'], // 16px
    },
    
    // Labels
    label: {
      ...textPresets.label,
      color: theme.colors.text.primary,
      marginBottom: spacing['2'], // 8px
    },
    floatingLabel: {
      ...textPresets.label,
      color: theme.colors.text.secondary,
      position: 'absolute',
      left: spacing['3'], // 12px
      top: spacing['3'], // 12px
      backgroundColor: theme.colors.surface,
      paddingHorizontal: spacing['1'], // 4px
      zIndex: 1,
    },
    required: {
      color: theme.colors.error[500],
    },

    // Input container
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: layout.inputBorderRadius,
      backgroundColor: theme.colors.surface,
      overflow: 'hidden',
    },
    inputWrapper: {
      flex: 1,
      position: 'relative',
    },

    // Variants
    outlined: {
      borderWidth: layout.borderWidth.thin,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    filled: {
      backgroundColor: theme.colors.neutral[50],
      borderWidth: 0,
    },
    underlined: {
      borderBottomWidth: layout.borderWidth.medium,
      borderBottomColor: theme.colors.border,
      borderRadius: 0,
      backgroundColor: 'transparent',
    },
    floating: {
      borderWidth: layout.borderWidth.thin,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      ...getModernShadow('input'),
    },

    // Sizes
    smallSize: {
      minHeight: spacing['8'], // 32px
    },
    mediumSize: {
      minHeight: layout.minTouchTarget, // 44px
    },
    largeSize: {
      minHeight: spacing['14'], // 56px
    },

    // States
    focused: {
      borderColor: theme.colors.primary[500],
      ...getModernShadow('inputFocused'),
    },
    error: {
      borderColor: theme.colors.error[500],
    },
    success: {
      borderColor: theme.colors.success[500],
    },
    disabled: {
      opacity: 0.6,
      backgroundColor: theme.colors.neutral[100],
    },

    // Input field
    input: {
      ...textPresets.body,
      color: theme.colors.text.primary,
      paddingHorizontal: layout.inputPadding.horizontal,
      paddingVertical: layout.inputPadding.vertical,
      textAlignVertical: 'center',
    },
    smallInput: {
      paddingVertical: spacing['2'], // 8px
    },
    mediumInput: {
      paddingVertical: layout.inputPadding.vertical, // 10px
    },
    largeInput: {
      paddingVertical: spacing['4'], // 16px
    },

    // Icons
    leftIcon: {
      paddingLeft: spacing['3'], // 12px
      justifyContent: 'center',
      alignItems: 'center',
    },
    rightIcon: {
      paddingRight: spacing['3'], // 12px
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Helper text
    errorText: {
      ...textPresets.caption,
      color: theme.colors.error[500],
      marginTop: spacing['1'], // 4px
    },
    hintText: {
      ...textPresets.caption,
      color: theme.colors.text.secondary,
      marginTop: spacing['1'], // 4px
    },
  });

export default TextInput;
