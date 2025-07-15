import { Platform } from 'react-native';

export interface FontFamily {
  light: string;
  regular: string;
  medium: string;
  semibold: string;
  bold: string;
  black: string;
}

export interface FontSizes {
  '2xs': number;
  xs: number;
  sm: number;
  base: number;
  lg: number;
  xl: number;
  '2xl': number;
  '3xl': number;
  '4xl': number;
  '5xl': number;
  '6xl': number;
  '7xl': number;
}

export interface FontWeights {
  light: '300';
  regular: '400';
  medium: '500';
  semibold: '600';
  bold: '700';
  black: '800' | '900';
}

export interface LineHeights {
  tight: number;
  normal: number;
  relaxed: number;
  loose: number;
}

export interface Typography {
  fontFamily: FontFamily;
  fontSize: FontSizes;
  fontWeight: FontWeights;
  lineHeight: LineHeights;
}

// Platform-specific font families - Using premium fonts
const getFontFamily = (): FontFamily => {
  if (Platform.OS === 'ios') {
    // Using San Francisco (SF Pro Display) for iOS
    return {
      light: 'System-Light',
      regular: 'System',
      medium: 'System-Medium',
      semibold: 'System-Semibold',
      bold: 'System-Bold',
      black: 'System-Black',
    };
  } else {
    // Using system default with Inter/Poppins fallback for Android
    return {
      light: 'sans-serif-light',
      regular: 'sans-serif',
      medium: 'sans-serif-medium',
      semibold: 'sans-serif-medium',
      bold: 'sans-serif-bold',
      black: 'sans-serif-black',
    };
  }
};

export const typography: Typography = {
  fontFamily: getFontFamily(),
  fontSize: {
    '2xs': 10,
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 40,
    '6xl': 48,
    '7xl': 56,
  },
  fontWeight: {
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    black: '800',
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.6,
    relaxed: 1.8,
    loose: 2.1,
  },
};

// Typography presets for consistent text styles
export const textPresets = {
  // Display text (for hero sections)
  display: {
    fontSize: typography.fontSize['7xl'],
    fontWeight: typography.fontWeight.black,
    lineHeight: typography.fontSize['7xl'] * typography.lineHeight.tight,
    letterSpacing: -1,
  },
  // Heading levels
  h1: {
    fontSize: typography.fontSize['5xl'],
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.fontSize['5xl'] * typography.lineHeight.tight,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.fontSize['4xl'] * typography.lineHeight.tight,
    letterSpacing: -0.25,
  },
  h3: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.fontSize['3xl'] * typography.lineHeight.tight,
  },
  h4: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.fontSize['2xl'] * typography.lineHeight.normal,
  },
  h5: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.fontSize.xl * typography.lineHeight.normal,
  },
  h6: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.fontSize.lg * typography.lineHeight.normal,
  },
  // Body text
  bodyLarge: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.fontSize.lg * typography.lineHeight.relaxed,
  },
  body: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
  },
  bodySmall: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  // Specialized text
  subtitle1: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.fontSize.lg * typography.lineHeight.normal,
  },
  subtitle2: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
  },
  caption: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.fontSize.xs * typography.lineHeight.normal,
  },
  overline: {
    fontSize: typography.fontSize['2xs'],
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.fontSize['2xs'] * typography.lineHeight.normal,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  // Button text
  buttonLarge: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.fontSize.lg * typography.lineHeight.normal,
  },
  button: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
  },
  buttonSmall: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  // Link text
  link: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
    textDecorationLine: 'underline' as const,
  },
  // Label text
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
};
