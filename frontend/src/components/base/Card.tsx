import React from 'react';
import {
  View,
  ViewProps,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@theme/ThemeContext';
import { Theme } from '@theme/index';

interface CardProps extends ViewProps {
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'small' | 'medium' | 'large';
  onPress?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'elevated',
  padding = 'medium',
  onPress,
  disabled = false,
  children,
  style,
  ...props
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  
  const cardStyle: ViewStyle[] = [
    styles.base,
    styles[variant],
    styles[`${padding}Padding`],
    ...(disabled ? [styles.disabled] : []),
    ...(style ? [style as ViewStyle] : []),
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
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

const createStyles = (theme: Theme) => StyleSheet.create({
  base: {
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
  },
  
  // Variants
  elevated: {
    ...theme.shadows.sm,
    shadowColor: theme.shadows.sm.shadowColor,
  },
  outlined: {
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
  },
  filled: {
    backgroundColor: theme.colors.neutral[100],
  },
  
  // Padding
  nonePadding: {
    padding: 0,
  },
  smallPadding: {
    padding: theme.spacing.s,
  },
  mediumPadding: {
    padding: theme.spacing.m,
  },
  largePadding: {
    padding: theme.spacing.l,
  },
  
  // States
  disabled: {
    opacity: 0.5,
  },
});

export default Card;