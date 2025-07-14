import { Theme, Colors, TextColors, ColorScale } from '@/theme';
import { useTheme as useThemeContext } from '@/theme/ThemeContext';
import { rs } from '@/utils/responsive';

// Extended colors interface with flattened text colors
interface ExtendedColors extends Colors {
  text: TextColors;
  textSecondary: string;
  textDisabled: string;
  textInverse: string;
  border: string;
  borderLight: string;
  borderDark: string;
  gray: ColorScale;
  shadow: string;
}

// Extended theme interface with flattened colors for easier access
interface ExtendedTheme extends Theme {
  colors: ExtendedColors;
}

/**
 * Enhanced useTheme hook that provides flattened color structure
 * for easier access in components
 */
export const useTheme = () => {
  try {
    const { theme: originalTheme, ...rest } = useThemeContext();

    // Defensive coding: handle case where theme might be undefined during initialization
    if (!originalTheme) {
      // Return a minimal theme to prevent crashes during initialization
      const fallbackTheme: ExtendedTheme = {
        colors: {
          primary: { 500: '#2196F3' },
          secondary: { 500: '#FF9800' },
          neutral: { 100: '#f5f5f5', 200: '#e0e0e0', 300: '#bdbdbd', 400: '#757575' },
          success: { 500: '#4CAF50' },
          warning: { 500: '#FF9800' },
          error: { 500: '#F44336' },
          surface: '#ffffff',
          background: '#ffffff',
          text: {
            primary: '#000000',
            secondary: '#757575',
            disabled: '#bdbdbd',
            inverse: '#ffffff',
          },
          textSecondary: '#757575',
          textDisabled: '#bdbdbd',
          textInverse: '#ffffff',
          border: '#e0e0e0',
          borderLight: '#f5f5f5',
          borderDark: '#bdbdbd',
          gray: { 100: '#f5f5f5', 200: '#e0e0e0', 300: '#bdbdbd', 400: '#757575' },
          shadow: 'rgba(0, 0, 0, 0.2)',
        } as ExtendedColors,
        typography: { fontSize: { base: 16 } },
        spacing: { xs: 4, s: 8, m: 16, l: 24, xl: 32 },
        grid: { columns: 12, gutter: 16 },
        layout: { maxWidth: 1200 },
        shadows: { 
          none: { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
          md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 }
        },
        borderRadius: { xs: 2, sm: 4, md: 8, lg: 12, xl: 16 },
        borderWidth: { thin: 1, medium: 2, thick: 4 },
        isDark: false,
      };
      
      return {
        theme: fallbackTheme,
        ...rest,
      };
    }

    // Create flattened color structure while preserving all original theme properties
    const theme: ExtendedTheme = {
      ...originalTheme, // This preserves shadows, spacing, typography, etc.
      colors: {
        ...originalTheme.colors,
        // Flatten text colors for easier access
        text: {
          primary: originalTheme.colors?.text?.primary || '#000000',
          secondary: originalTheme.colors?.text?.secondary || '#757575',
          disabled: originalTheme.colors?.text?.disabled || '#bdbdbd',
          inverse: originalTheme.colors?.text?.inverse || '#ffffff',
        },
        textSecondary: originalTheme.colors?.text?.secondary || '#757575',
        textDisabled: originalTheme.colors?.text?.disabled || '#bdbdbd',
        textInverse: originalTheme.colors?.text?.inverse || '#ffffff',
        // Add commonly used border colors
        border: originalTheme.colors?.neutral?.[300] || '#e0e0e0',
        borderLight: originalTheme.colors?.neutral?.[200] || '#f5f5f5',
        borderDark: originalTheme.colors?.neutral?.[400] || '#bdbdbd',
        // Add missing color properties
        gray: originalTheme.colors?.neutral || {},
        shadow: originalTheme.isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.2)',
      } as ExtendedColors,
    };

    return {
      theme,
      ...rest,
    };
  } catch (error) {
    console.error('Error in extended useTheme hook:', error);
    // Return minimal theme as fallback
    const fallbackTheme: ExtendedTheme = {
      colors: {
        primary: { 500: '#2196F3' },
        secondary: { 500: '#FF9800' },
        neutral: { 100: '#f5f5f5', 200: '#e0e0e0', 300: '#bdbdbd', 400: '#757575' },
        success: { 500: '#4CAF50' },
        warning: { 500: '#FF9800' },
        error: { 500: '#F44336' },
        surface: '#ffffff',
        background: '#ffffff',
        text: {
          primary: '#000000',
          secondary: '#757575',
          disabled: '#bdbdbd',
          inverse: '#ffffff',
        },
        textSecondary: '#757575',
        textDisabled: '#bdbdbd',
        textInverse: '#ffffff',
        border: '#e0e0e0',
        borderLight: '#f5f5f5',
        borderDark: '#bdbdbd',
        gray: { 100: '#f5f5f5', 200: '#e0e0e0', 300: '#bdbdbd', 400: '#757575' },
        shadow: 'rgba(0, 0, 0, 0.2)',
      } as ExtendedColors,
      typography: { fontSize: { base: 16 } },
      spacing: { xs: 4, s: 8, m: 16, l: 24, xl: 32 },
      grid: { columns: 12, gutter: 16 },
      layout: { maxWidth: 1200 },
      shadows: { 
        none: { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
        md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 }
      },
      borderRadius: { xs: 2, sm: 4, md: 8, lg: 12, xl: 16 },
      borderWidth: { thin: 1, medium: 2, thick: 4 },
      isDark: false,
    };
    
    return {
      theme: fallbackTheme,
      toggleTheme: () => {},
      setTheme: () => {},
      themeMode: 'light' as const,
    };
  }
};

export default useTheme;
