import { Colors, lightColors, darkColors } from './colors';
import { Typography, typography } from './typography';
import { SpacingScale, spacing, grid, layout } from './spacing';
import { ShadowScale, shadows } from './shadows';
import { RadiusScale, BorderWidths, borderRadius, borderWidth } from './borders';

export interface Theme {
  colors: Colors;
  typography: Typography;
  spacing: SpacingScale;
  grid: typeof grid;
  layout: typeof layout;
  shadows: ShadowScale;
  borderRadius: RadiusScale;
  borderWidth: BorderWidths;
  isDark: boolean;
}

export const lightTheme: Theme = {
  colors: lightColors,
  typography,
  spacing,
  grid,
  layout,
  shadows,
  borderRadius,
  borderWidth,
  isDark: false,
};

export const darkTheme: Theme = {
  colors: darkColors,
  typography,
  spacing,
  grid,
  layout,
  shadows,
  borderRadius,
  borderWidth,
  isDark: true,
};

// Re-export all theme types and utilities
export * from './colors';
export * from './typography';
export * from './spacing';
export * from './shadows';
export * from './borders';