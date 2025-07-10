import React, { useState, forwardRef } from 'react';
import {
  View,
  Text,
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '@theme/ThemeContext';
import { Theme } from '@theme/index';

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
  variant?: 'outlined' | 'filled';
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
      editable = true,
      ...props
    },
    ref
  ) => {
    const { theme } = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const styles = createStyles(theme);

    const hasError = !!error;

    const inputContainerStyle: ViewStyle[] = [
      styles.inputContainer,
      styles[variant],
      ...(isFocused ? [styles.focused] : []),
      ...(hasError ? [styles.error] : []),
      ...(!editable ? [styles.disabled] : []),
    ];

    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        )}

        <View style={inputContainerStyle}>
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

          <RNTextInput
            ref={ref}
            style={[styles.input, inputStyle]}
            placeholderTextColor={theme.colors.neutral[500]}
            editable={editable}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />

          {rightIcon && (
            <TouchableOpacity
              style={styles.rightIcon}
              onPress={onRightIconPress}
              disabled={!onRightIconPress}
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
      marginBottom: theme.spacing.m,
    },
    label: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xs,
      fontWeight: '500',
    },
    required: {
      color: theme.colors.error[500],
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: theme.borderRadius.md,
      minHeight: 48,
    },
    outlined: {
      borderWidth: 1,
      borderColor: theme.colors.neutral[300],
      backgroundColor: 'transparent',
    },
    filled: {
      backgroundColor: theme.colors.neutral[100],
      borderWidth: 1,
      borderColor: 'transparent',
    },
    focused: {
      borderColor: theme.colors.primary[500],
    },
    error: {
      borderColor: theme.colors.error[500],
    },
    disabled: {
      opacity: 0.5,
      backgroundColor: theme.colors.neutral[100],
    },
    input: {
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      paddingHorizontal: theme.spacing.s,
      paddingVertical: theme.spacing.s,
    },
    leftIcon: {
      paddingLeft: theme.spacing.s,
    },
    rightIcon: {
      paddingRight: theme.spacing.s,
    },
    errorText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.error[500],
      marginTop: theme.spacing.xs,
    },
    hintText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.xs,
    },
  });

export default TextInput;
