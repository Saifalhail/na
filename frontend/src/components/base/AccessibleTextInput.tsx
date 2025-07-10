import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { getInputAccessibilityProps, announce } from '@/utils/accessibility';

interface AccessibleTextInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: any;
  inputStyle?: any;
  showCharacterCount?: boolean;
  maxCharacters?: number;
}

export const AccessibleTextInput: React.FC<AccessibleTextInputProps> = ({
  label,
  error,
  hint,
  required = false,
  icon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  showCharacterCount = false,
  maxCharacters,
  value = '',
  onChangeText,
  onFocus,
  onBlur,
  editable = true,
  ...props
}) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const labelAnimation = useRef(new Animated.Value(value ? 1 : 0)).current;

  const handleFocus = (e: any) => {
    setIsFocused(true);
    Animated.timing(labelAnimation, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (!value) {
      Animated.timing(labelAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
    onBlur?.(e);
  };

  const handleChangeText = (text: string) => {
    if (maxCharacters && text.length > maxCharacters) {
      return;
    }
    onChangeText?.(text);

    // Announce character count for screen readers
    if (showCharacterCount && maxCharacters) {
      const remaining = maxCharacters - text.length;
      if (remaining <= 10) {
        announce(`${remaining} characters remaining`);
      }
    }
  };

  const accessibilityProps = getInputAccessibilityProps(label, error, required);

  const labelStyle = {
    position: 'absolute' as const,
    left: icon ? 40 : 16,
    top: labelAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [18, 8],
    }),
    fontSize: labelAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 12],
    }),
    color: error
      ? theme.colors.error[500]
      : isFocused
        ? theme.colors.primary[500]
        : theme.colors.textSecondary,
  };

  const borderColor = error
    ? theme.colors.error[500]
    : isFocused
      ? theme.colors.primary[500]
      : theme.colors.borderLight;

  return (
    <View style={[styles.container, containerStyle]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => inputRef.current?.focus()}
        accessible={false}
      >
        <View style={[styles.inputContainer, { borderColor }, !editable && styles.disabled]}>
          {icon && <View style={styles.icon}>{icon}</View>}

          <Animated.Text style={labelStyle}>
            {label}
            {required && <Text style={{ color: theme.colors.error[500] }}> *</Text>}
          </Animated.Text>

          <TextInput
            {...props}
            {...accessibilityProps}
            ref={inputRef}
            value={value}
            onChangeText={handleChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            editable={editable}
            style={[
              styles.input,
              icon && styles.inputWithIcon,
              inputStyle,
              { color: theme.colors.text },
            ]}
            placeholderTextColor={theme.colors.textSecondary}
            selectionColor={theme.colors.primary[500]}
          />

          {rightIcon && (
            <TouchableOpacity
              onPress={onRightIconPress}
              style={styles.rightIcon}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`${label} action button`}
            >
              {rightIcon}
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>

      {(error || hint || showCharacterCount) && (
        <View style={styles.footer}>
          {(error || hint) && (
            <Text
              style={[
                styles.helperText,
                error ? { color: theme.colors.error[500] } : { color: theme.colors.textSecondary },
              ]}
              accessibilityLiveRegion={error ? 'assertive' : 'polite'}
            >
              {error || hint}
            </Text>
          )}

          {showCharacterCount && maxCharacters && (
            <Text
              style={[styles.characterCount, { color: theme.colors.textSecondary }]}
              accessibilityLabel={`${value.length} of ${maxCharacters} characters used`}
            >
              {value.length}/{maxCharacters}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    minHeight: 56,
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  inputWithIcon: {
    paddingLeft: 40,
  },
  icon: {
    position: 'absolute',
    left: 16,
    top: '50%',
    transform: [{ translateY: -12 }],
  },
  rightIcon: {
    padding: 8,
    marginRight: -8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
  },
  helperText: {
    fontSize: 12,
    flex: 1,
  },
  characterCount: {
    fontSize: 12,
    marginLeft: 8,
  },
});
