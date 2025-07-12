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

export type ChipVariant = 'filled' | 'outlined';
export type ChipSize = 'small' | 'medium' | 'large';

interface ChipProps {
  label: string;
  variant?: ChipVariant;
  size?: ChipSize;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  onDelete?: () => void;
  icon?: React.ReactNode;
  avatar?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  variant = 'filled',
  size = 'medium',
  selected = false,
  disabled = false,
  onPress,
  onDelete,
  icon,
  avatar,
  style,
  textStyle,
  testID,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const isClickable = !!onPress && !disabled;
  const isDeletable = !!onDelete && !disabled;

  const chipStyle = [
    styles.base,
    styles[variant],
    styles[`${size}Size`],
    selected && styles.selected,
    selected && styles[`${variant}Selected`],
    disabled && styles.disabled,
    style,
  ].filter(Boolean) as ViewStyle[];

  const chipTextStyle = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    selected && styles.selectedText,
    disabled && styles.disabledText,
    textStyle,
  ].filter(Boolean) as TextStyle[];

  const iconSize = size === 'small' ? 14 : size === 'medium' ? 16 : 18;

  const content = (
    <>
      {avatar && <View style={styles.avatar}>{avatar}</View>}
      {icon && !avatar && <View style={styles.icon}>{icon}</View>}
      <Text style={chipTextStyle} numberOfLines={1}>
        {label}
      </Text>
      {isDeletable && (
        <TouchableOpacity
          onPress={onDelete}
          style={styles.deleteButton}
          accessibilityLabel={`Remove ${label}`}
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name="close-circle"
            size={iconSize}
            color={
              variant === 'filled'
                ? selected
                  ? theme.colors.white
                  : theme.colors.neutral[600]
                : theme.colors.primary[500]
            }
          />
        </TouchableOpacity>
      )}
    </>
  );

  if (isClickable) {
    return (
      <TouchableOpacity
        style={chipStyle}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        testID={testID || `chip-${label}`}
        accessibilityLabel={accessibilityLabel || label}
        accessibilityHint={accessibilityHint || (selected ? 'Selected' : 'Tap to select')}
        accessibilityRole="button"
        accessibilityState={{
          selected,
          disabled,
        }}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={chipStyle}
      testID={testID || `chip-${label}`}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityRole="text"
    >
      {content}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: theme.borderRadius.full,
      alignSelf: 'flex-start',
    },

    // Variants
    filled: {
      backgroundColor: theme.colors.neutral[200],
    },
    outlined: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.neutral[400],
    },

    // Selected states
    selected: {
      backgroundColor: theme.colors.primary[500],
    },
    filledSelected: {
      backgroundColor: theme.colors.primary[500],
    },
    outlinedSelected: {
      borderColor: theme.colors.primary[500],
      backgroundColor: theme.colors.primary[50],
    },

    // Sizes
    smallSize: {
      height: 24,
      paddingHorizontal: theme.spacing.xs,
    },
    mediumSize: {
      height: 32,
      paddingHorizontal: theme.spacing.s,
    },
    largeSize: {
      height: 40,
      paddingHorizontal: theme.spacing.m,
    },

    // Text
    text: {
      fontFamily: theme.typography.fontFamily.regular,
      fontWeight: '500',
    },

    // Text variants
    filledText: {
      color: theme.colors.neutral[800],
    },
    outlinedText: {
      color: theme.colors.neutral[800],
    },

    // Text sizes
    smallText: {
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.fontSize.xs * 1.2,
    },
    mediumText: {
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.fontSize.sm * 1.2,
    },
    largeText: {
      fontSize: theme.typography.fontSize.base,
      lineHeight: theme.typography.fontSize.base * 1.2,
    },

    // States
    selectedText: {
      color: theme.colors.white,
    },
    disabled: {
      opacity: 0.5,
    },
    disabledText: {
      color: theme.colors.neutral[500],
    },

    // Elements
    icon: {
      marginRight: theme.spacing.xxs,
    },
    avatar: {
      marginRight: theme.spacing.xxs,
      marginLeft: -theme.spacing.xxs,
    },
    deleteButton: {
      marginLeft: theme.spacing.xxs,
      marginRight: -theme.spacing.xxs,
    },
  });

// ChipGroup component for managing multiple chips
interface ChipGroupProps {
  children: React.ReactNode;
  spacing?: number;
  wrap?: boolean;
  style?: ViewStyle;
}

export const ChipGroup: React.FC<ChipGroupProps> = ({
  children,
  spacing = 8,
  wrap = true,
  style,
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          flexWrap: wrap ? 'wrap' : 'nowrap',
          marginHorizontal: -spacing / 2,
          marginVertical: -spacing / 2,
        },
        style,
      ]}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child) ? (
          <View style={{ marginHorizontal: spacing / 2, marginVertical: spacing / 2 }}>
            {child}
          </View>
        ) : null
      )}
    </View>
  );
};

export default Chip;