import React from 'react';
import { View, ViewProps, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';
import { getModernShadow } from '@/theme/shadows';
import { spacing, layout } from '@/theme/spacing';

export type CardVariant = 'elevated' | 'outlined' | 'filled' | 'glass' | 'gradient';
export type CardPadding = 'none' | 'small' | 'medium' | 'large' | 'xl';
export type CardRadius = 'none' | 'small' | 'medium' | 'large' | 'xl' | 'full';

interface CardProps extends ViewProps {
  variant?: CardVariant;
  padding?: CardPadding;
  radius?: CardRadius;
  onPress?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  pressable?: boolean;
  elevated?: boolean;
  borderColor?: string;
  backgroundColor?: string;
}

export const Card: React.FC<CardProps> = ({
  variant = 'elevated',
  padding = 'medium',
  radius = 'medium',
  onPress,
  disabled = false,
  children,
  style,
  pressable = false,
  elevated = true,
  borderColor,
  backgroundColor,
  ...props
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const cardStyle: ViewStyle[] = [
    styles.base,
    styles[variant],
    styles[`${padding}Padding`],
    styles[`${radius}Radius`],
    elevated && variant === 'elevated' && styles.elevation,
    disabled && styles.disabled,
    borderColor && { borderColor },
    backgroundColor && { backgroundColor },
    style as ViewStyle,
  ].filter(Boolean);

  const isInteractive = onPress || pressable;

  if (isInteractive) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.95}
        {...props}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle} {...props}>
      {children}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      backgroundColor: theme.colors.surface,
      overflow: 'hidden',
    },

    // Variants
    elevated: {
      backgroundColor: theme.isDark ? theme.colors.neutral[100] : theme.colors.white,
      borderWidth: 0,
    },
    outlined: {
      backgroundColor: theme.colors.surface,
      borderWidth: layout.borderWidth.thin,
      borderColor: theme.colors.border,
    },
    filled: {
      backgroundColor: theme.isDark ? theme.colors.neutral[200] : theme.colors.neutral[50],
      borderWidth: 0,
    },
    glass: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: layout.borderWidth.thin,
      borderColor: 'rgba(255, 255, 255, 0.2)',
      backdropFilter: 'blur(10px)',
    },
    gradient: {
      backgroundColor: 'transparent',
      borderWidth: 0,
    },

    // Padding variants
    nonePadding: {
      padding: 0,
    },
    smallPadding: {
      padding: spacing['3'], // 12px
    },
    mediumPadding: {
      padding: layout.cardPadding, // 16px
    },
    largePadding: {
      padding: layout.cardPaddingLarge, // 24px
    },
    xlPadding: {
      padding: spacing['8'], // 32px
    },

    // Border radius variants
    noneRadius: {
      borderRadius: 0,
    },
    smallRadius: {
      borderRadius: spacing['1'], // 4px
    },
    mediumRadius: {
      borderRadius: layout.cardBorderRadius, // 8px
    },
    largeRadius: {
      borderRadius: layout.cardBorderRadiusLarge, // 12px
    },
    xlRadius: {
      borderRadius: spacing['4'], // 16px
    },
    fullRadius: {
      borderRadius: spacing['12'], // 48px
    },

    // Elevation
    elevation: {
      ...getModernShadow('card'),
    },

    // States
    disabled: {
      opacity: 0.6,
    },
  });

export default Card;
