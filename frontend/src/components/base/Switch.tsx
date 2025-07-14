import React from 'react';
import {
  View,
  Text,
  Switch as RNSwitch,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  SwitchProps as RNSwitchProps,
  Platform,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';
import { spacing, layout } from '@/theme/spacing';
import { textPresets } from '@/theme/typography';
import { getModernShadow } from '@/theme/shadows';

interface SwitchProps extends Omit<RNSwitchProps, 'value' | 'onValueChange'> {
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  error?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'card';
  style?: ViewStyle;
}

export const Switch: React.FC<SwitchProps> = ({
  value = false,
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
    if (!disabled && onValueChange) {
      onValueChange(!value);
    }
  };

  const switchComponent = (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{
        false: theme.isDark ? theme.colors.neutral[600] : theme.colors.neutral[300],
        true: theme.isDark ? theme.colors.primary[600] : theme.colors.primary[500],
      }}
      thumbColor={
        Platform.OS === 'ios' 
          ? theme.colors.white 
          : value 
            ? theme.colors.white 
            : theme.isDark 
              ? theme.colors.neutral[300] 
              : theme.colors.neutral[50]
      }
      ios_backgroundColor={theme.isDark ? theme.colors.neutral[600] : theme.colors.neutral[300]}
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
      marginVertical: spacing['1'], // 4px
    },
    touchable: {
      borderRadius: layout.buttonBorderRadius,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing['2'], // 8px
    },
    cardContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: layout.cardBorderRadius,
      padding: spacing['4'], // 16px
      ...getModernShadow('card'),
    },
    cardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    textContainer: {
      flex: 1,
      marginRight: spacing['4'], // 16px
    },
    label: {
      ...textPresets.body,
      color: theme.colors.text.primary,
      fontWeight: theme.typography.fontWeight.medium,
      marginBottom: spacing['1'], // 4px
    },
    description: {
      ...textPresets.caption,
      color: theme.colors.text.secondary,
    },
    disabledText: {
      color: theme.colors.text.disabled,
    },
    disabled: {
      opacity: 0.6,
    },
    error: {
      ...textPresets.caption,
      color: theme.colors.error[500],
      marginTop: spacing['1'], // 4px
    },
    // Switch sizes
    switch: {
      alignSelf: 'center',
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
    // Group styles
    group: {
      marginVertical: spacing['2'], // 8px
    },
    groupTitle: {
      ...textPresets.body,
      color: theme.colors.text.primary,
      fontWeight: theme.typography.fontWeight.semibold,
      marginBottom: spacing['3'], // 12px
    },
    groupContent: {
      gap: spacing['2'], // 8px
    },
  });

export default Switch;