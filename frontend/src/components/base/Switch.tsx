import React from 'react';
import { borderRadius, rs } from '@/utils/responsive';
import {
  View,
  Text,
  Switch as RNSwitch,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  SwitchProps as RNSwitchProps,
} from 'react-native';
import { useTheme } from '@theme/ThemeContext';
import { Theme } from '@theme/index';

interface SwitchProps extends Omit<RNSwitchProps, 'value' | 'onValueChange'> {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  error?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'card';
  style?: ViewStyle;
}

export const Switch: React.FC<SwitchProps> = ({
  value,
  onValueChange,
  label,
  description,
  disabled = false,
  error,
  size = 'medium',
  variant = 'default',
  style,
  ...props
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const handlePress = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  const switchComponent = (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{
        false: theme.colors.neutral[300],
        true: theme.colors.primary[500],
      }}
      thumbColor={theme.colors.surface}
      ios_backgroundColor={theme.colors.neutral[300]}
      style={[styles.switch, styles[`${size}Switch`]]}
      {...props}
    />
  );

  if (variant === 'card') {
    return (
      <TouchableOpacity
        style={[styles.cardContainer, disabled && styles.disabled, style]}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={styles.textContainer}>
            {label && <Text style={[styles.label, disabled && styles.disabledText]}>{label}</Text>}
            {description && (
              <Text style={[styles.description, disabled && styles.disabledText]}>
                {description}
              </Text>
            )}
          </View>
          {switchComponent}
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.touchable}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <View style={styles.content}>
          <View style={styles.textContainer}>
            {label && <Text style={[styles.label, disabled && styles.disabledText]}>{label}</Text>}
            {description && (
              <Text style={[styles.description, disabled && styles.disabledText]}>
                {description}
              </Text>
            )}
          </View>
          {switchComponent}
        </View>
      </TouchableOpacity>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

interface SwitchGroupProps {
  children: React.ReactNode;
  title?: string;
  style?: ViewStyle;
}

export const SwitchGroup: React.FC<SwitchGroupProps> = ({ children, title, style }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={[styles.group, style]}>
      {title && <Text style={styles.groupTitle}>{title}</Text>}
      <View style={styles.groupContent}>{children}</View>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginVertical: theme.spacing.xs,
    },
    touchable: {
      borderRadius: theme.borderRadius.md,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.s,
    },
    cardContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.m,
      ...theme.shadows.sm,
    },
    cardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    textContainer: {
      flex: 1,
      marginRight: theme.spacing.m,
    },
    label: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: '600',
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xs,
    },
    description: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.secondary,
      lineHeight: 18,
    },
    switch: {
      // Default switch styles
    },
    smallSwitch: {
      transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
    },
    mediumSwitch: {
      // Default size
    },
    largeSwitch: {
      transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }],
    },
    disabled: {
      opacity: 0.5,
    },
    disabledText: {
      opacity: 0.5,
    },
    error: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.error[500],
      marginTop: theme.spacing.xs,
    },
    group: {
      marginBottom: theme.spacing.m,
    },
    groupTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.s,
    },
    groupContent: {
      gap: theme.spacing.xs,
    },
  });

export default Switch;
