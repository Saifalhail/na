export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

export interface TextColors {
  primary: string;
  secondary: string;
  disabled: string;
  inverse: string;
}

export interface GradientDefinition {
  colors: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}

export interface Gradients {
  primary: GradientDefinition;
  secondary: GradientDefinition;
  success: GradientDefinition;
  warning: GradientDefinition;
  error: GradientDefinition;
  info: GradientDefinition;
  sunset: GradientDefinition;
  ocean: GradientDefinition;
  forest: GradientDefinition;
  aurora: GradientDefinition;
  candy: GradientDefinition;
  midnight: GradientDefinition;
}

export interface Colors {
  primary: ColorScale;
  secondary: ColorScale;
  neutral: ColorScale;
  success: ColorScale;
  warning: ColorScale;
  error: ColorScale;
  info: ColorScale;
  background: string;
  surface: string;
  text: TextColors;
  white: string;
  black: string;
  // Convenience properties
  textSecondary: string;
  shadow: string;
  border: string;
  borderLight: string;
  // New gradient system
  gradients: Gradients;
  // Accent colors for visual pop
  accent: {
    purple: string;
    pink: string;
    cyan: string;
    lime: string;
    amber: string;
  };
}

export const lightColors: Colors = {
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  secondary: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
  },
  neutral: {
    50: '#FAFAFA',
    100: '#F4F4F5',
    200: '#E4E4E7',
    300: '#D4D4D8',
    400: '#A1A1AA',
    500: '#71717A',
    600: '#52525B',
    700: '#3F3F46',
    800: '#27272A',
    900: '#18181B',
  },
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
  },
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },
  info: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  background: '#FFFFFF',
  surface: '#FAFAFA',
  text: {
    primary: '#18181B',
    secondary: '#71717A',
    disabled: '#A1A1AA',
    inverse: '#FFFFFF',
  },
  white: '#FFFFFF',
  black: '#000000',
  // Convenience properties
  textSecondary: '#71717A',
  shadow: '#18181B',
  border: '#E4E4E7',
  borderLight: '#F4F4F5',
  // New gradient system
  gradients: {
    primary: {
      colors: ['#60A5FA', '#3B82F6', '#2563EB'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    secondary: {
      colors: ['#4ADE80', '#22C55E', '#16A34A'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    success: {
      colors: ['#4ADE80', '#22C55E', '#15803D'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    warning: {
      colors: ['#FBBF24', '#F59E0B', '#D97706'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    error: {
      colors: ['#F87171', '#EF4444', '#DC2626'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    info: {
      colors: ['#60A5FA', '#3B82F6', '#2563EB'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    sunset: {
      colors: ['#FBBF24', '#F97316', '#EA580C'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0.8 },
    },
    ocean: {
      colors: ['#06B6D4', '#0891B2', '#0E7490'],
      start: { x: 0, y: 0 },
      end: { x: 0.8, y: 1 },
    },
    forest: {
      colors: ['#4ADE80', '#22C55E', '#15803D'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    aurora: {
      colors: ['#A855F7', '#9333EA', '#7C3AED'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0.5 },
    },
    candy: {
      colors: ['#F472B6', '#EC4899', '#DB2777'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    midnight: {
      colors: ['#6366F1', '#4F46E5', '#4338CA'],
      start: { x: 0, y: 0 },
      end: { x: 0.5, y: 1 },
    },
  },
  // Accent colors for visual pop
  accent: {
    purple: '#A855F7',
    pink: '#EC4899',
    cyan: '#06B6D4',
    lime: '#84CC16',
    amber: '#F59E0B',
  },
};

export const darkColors: Colors = {
  primary: {
    50: '#1E3A8A',
    100: '#1E40AF',
    200: '#1D4ED8',
    300: '#2563EB',
    400: '#3B82F6',
    500: '#60A5FA',
    600: '#93C5FD',
    700: '#BFDBFE',
    800: '#DBEAFE',
    900: '#EFF6FF',
  },
  secondary: {
    50: '#14532D',
    100: '#166534',
    200: '#15803D',
    300: '#16A34A',
    400: '#22C55E',
    500: '#4ADE80',
    600: '#86EFAC',
    700: '#BBF7D0',
    800: '#DCFCE7',
    900: '#F0FDF4',
  },
  neutral: {
    50: '#121212', // Material Design dark background
    100: '#1E1E1E', // Elevated surface
    200: '#2D2D2D', // Higher elevation
    300: '#3D3D3D', // Even higher elevation
    400: '#4D4D4D',
    500: '#6D6D6D',
    600: '#8D8D8D',
    700: '#ADADAD',
    800: '#CDCDCD',
    900: '#EDEDED',
  },
  success: {
    50: '#14532D',
    100: '#166534',
    200: '#15803D',
    300: '#16A34A',
    400: '#22C55E',
    500: '#4ADE80',
    600: '#86EFAC',
    700: '#BBF7D0',
    800: '#DCFCE7',
    900: '#F0FDF4',
  },
  warning: {
    50: '#78350F',
    100: '#92400E',
    200: '#B45309',
    300: '#D97706',
    400: '#F59E0B',
    500: '#FBBF24',
    600: '#FCD34D',
    700: '#FDE68A',
    800: '#FEF3C7',
    900: '#FFFBEB',
  },
  error: {
    50: '#7F1D1D',
    100: '#991B1B',
    200: '#B91C1C',
    300: '#DC2626',
    400: '#EF4444',
    500: '#F87171',
    600: '#FCA5A5',
    700: '#FECACA',
    800: '#FEE2E2',
    900: '#FEF2F2',
  },
  info: {
    50: '#1E3A8A',
    100: '#1E40AF',
    200: '#1D4ED8',
    300: '#2563EB',
    400: '#3B82F6',
    500: '#60A5FA',
    600: '#93C5FD',
    700: '#BFDBFE',
    800: '#DBEAFE',
    900: '#EFF6FF',
  },
  background: '#121212', // Material Design dark background
  surface: '#1E1E1E', // Elevated surface for cards
  text: {
    primary: '#FFFFFF', // Full white for better contrast
    secondary: '#B3B3B3', // Slightly brighter secondary text
    disabled: '#6D6D6D',
    inverse: '#121212',
  },
  white: '#FFFFFF',
  black: '#000000',
  // Convenience properties
  textSecondary: '#B3B3B3',
  shadow: '#000000',
  border: '#2D2D2D', // Softer border color
  borderLight: '#3D3D3D',
  // New gradient system
  gradients: {
    primary: {
      colors: ['#93C5FD', '#60A5FA', '#3B82F6'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    secondary: {
      colors: ['#86EFAC', '#4ADE80', '#22C55E'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    success: {
      colors: ['#86EFAC', '#4ADE80', '#22C55E'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    warning: {
      colors: ['#FCD34D', '#FBBF24', '#F59E0B'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    error: {
      colors: ['#FCA5A5', '#F87171', '#EF4444'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    info: {
      colors: ['#93C5FD', '#60A5FA', '#3B82F6'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    sunset: {
      colors: ['#FCD34D', '#FB923C', '#F97316'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0.8 },
    },
    ocean: {
      colors: ['#67E8F9', '#22D3EE', '#06B6D4'],
      start: { x: 0, y: 0 },
      end: { x: 0.8, y: 1 },
    },
    forest: {
      colors: ['#86EFAC', '#4ADE80', '#22C55E'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    aurora: {
      colors: ['#C4B5FD', '#A78BFA', '#8B5CF6'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0.5 },
    },
    candy: {
      colors: ['#F9A8D4', '#F472B6', '#EC4899'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    midnight: {
      colors: ['#A5B4FC', '#818CF8', '#6366F1'],
      start: { x: 0, y: 0 },
      end: { x: 0.5, y: 1 },
    },
  },
  // Accent colors for visual pop
  accent: {
    purple: '#C4B5FD',
    pink: '#F9A8D4',
    cyan: '#67E8F9',
    lime: '#BEF264',
    amber: '#FCD34D',
  },
};
