import { Theme, Colors } from '@/theme';
import { useTheme as useThemeContext } from '@/theme/ThemeContext';

// Extended colors interface with flattened text colors
interface ExtendedColors extends Colors {
  text: string;
  textSecondary: string;
  textDisabled: string;
  textInverse: string;
  border: string;
  borderLight: string;
  borderDark: string;
}

// Extended theme interface with flattened colors for easier access
interface ExtendedTheme extends Omit<Theme, 'colors'> {
  colors: ExtendedColors;
}

/**
 * Enhanced useTheme hook that provides flattened color structure
 * for easier access in components
 */
export const useTheme = () => {
  const { theme: originalTheme, ...rest } = useThemeContext();

  // Create flattened color structure
  const theme: ExtendedTheme = {
    ...originalTheme,
    colors: {
      ...originalTheme.colors,
      // Flatten text colors for easier access
      text: originalTheme.colors.text.primary,
      textSecondary: originalTheme.colors.text.secondary,
      textDisabled: originalTheme.colors.text.disabled,
      textInverse: originalTheme.colors.text.inverse,
      // Add commonly used border colors
      border: originalTheme.colors.neutral[300],
      borderLight: originalTheme.colors.neutral[200],
      borderDark: originalTheme.colors.neutral[400],
    } as ExtendedColors,
  };

  return {
    theme,
    ...rest,
  };
};

export default useTheme;