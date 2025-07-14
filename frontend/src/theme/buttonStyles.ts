import { Theme } from './index';
import { spacing, layout } from './spacing';
import { textPresets } from './typography';
import { getModernShadow } from './shadows';

export const createButtonStyles = (theme: Theme) => ({
  // Base button styles
  base: {
    borderRadius: layout.buttonBorderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
    position: 'relative',
  },
  
  // Size variants
  sizes: {
    small: {
      paddingHorizontal: spacing['3'], // 12px
      paddingVertical: spacing['2'], // 8px
      minHeight: spacing['8'], // 32px
    },
    medium: {
      paddingHorizontal: spacing['4'], // 16px
      paddingVertical: spacing['3'], // 12px
      minHeight: spacing['10'], // 40px
    },
    large: {
      paddingHorizontal: spacing['6'], // 24px
      paddingVertical: spacing['4'], // 16px
      minHeight: spacing['12'], // 48px
    },
  },
  
  // Variant styles
  variants: {
    primary: {
      backgroundColor: theme.colors.primary[500],
      borderWidth: 0,
      ...getModernShadow('button'),
    },
    secondary: {
      backgroundColor: theme.colors.secondary[500],
      borderWidth: 0,
      ...getModernShadow('button'),
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: layout.borderWidth.medium,
      borderColor: theme.colors.primary[500],
    },
    text: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      paddingHorizontal: spacing['2'], // 8px
    },
    danger: {
      backgroundColor: theme.colors.error[500],
      borderWidth: 0,
      ...getModernShadow('button'),
    },
  },
  
  // Text styles for each variant
  textVariants: {
    primary: {
      ...textPresets.button,
      color: theme.colors.white,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    secondary: {
      ...textPresets.button,
      color: theme.colors.white,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    outline: {
      ...textPresets.button,
      color: theme.colors.primary[500],
      fontWeight: theme.typography.fontWeight.semibold,
    },
    text: {
      ...textPresets.button,
      color: theme.colors.primary[500],
      fontWeight: theme.typography.fontWeight.medium,
    },
    danger: {
      ...textPresets.button,
      color: theme.colors.white,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  },
  
  // Disabled states
  disabled: {
    opacity: 0.5,
  },
  
  // Pressed states
  pressed: {
    primary: {
      backgroundColor: theme.colors.primary[600],
    },
    secondary: {
      backgroundColor: theme.colors.secondary[600],
    },
    outline: {
      backgroundColor: theme.colors.primary[50],
    },
    text: {
      backgroundColor: theme.colors.primary[50],
    },
    danger: {
      backgroundColor: theme.colors.error[600],
    },
  },
});