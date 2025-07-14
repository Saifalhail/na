import { Platform } from 'react-native';

export interface Shadow {
  shadowColor: string;
  shadowOffset: {
    width: number;
    height: number;
  };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export interface ShadowScale {
  none: Shadow;
  xs: Shadow;
  sm: Shadow;
  base: Shadow;
  md: Shadow;
  lg: Shadow;
  xl: Shadow;
  '2xl': Shadow;
  '3xl': Shadow;
}

const createShadow = (
  offsetHeight: number,
  radius: number,
  opacity: number,
  elevation: number,
  offsetWidth: number = 0,
  shadowColor: string = '#000000'
): Shadow => ({
  shadowColor,
  shadowOffset: {
    width: offsetWidth,
    height: offsetHeight,
  },
  shadowOpacity: opacity,
  shadowRadius: radius,
  elevation: Platform.OS === 'android' ? elevation : 0,
});

export const shadows: ShadowScale = {
  none: createShadow(0, 0, 0, 0),
  xs: createShadow(1, 2, 0.05, 1),
  sm: createShadow(1, 3, 0.1, 2),
  base: createShadow(2, 4, 0.1, 3),
  md: createShadow(4, 6, 0.1, 4),
  lg: createShadow(8, 15, 0.12, 8),
  xl: createShadow(16, 20, 0.15, 12),
  '2xl': createShadow(20, 25, 0.2, 16),
  '3xl': createShadow(25, 35, 0.25, 20),
};

// Modern shadow utilities for enhanced design
export const modernShadows = {
  // Button shadows with color variations
  button: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonPressed: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  // Card shadows for different importance levels
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardElevated: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  cardHover: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  // Modal and overlay shadows
  modal: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 16,
  },
  drawer: {
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  // Floating action button and similar elements
  floating: {
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingPressed: {
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  // Input and form shadows
  input: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  inputFocused: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  // Navigation and tab shadows
  navigation: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  // Legacy shadows for backward compatibility
  low: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  high: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
};

// Platform-specific shadow utilities with fallback for undefined values
export const getShadow = (level: keyof ShadowScale): Shadow => {
  const shadow = shadows[level];
  
  // Defensive coding: if shadow is undefined, return a safe default
  if (!shadow) {
    return shadows.none;
  }

  if (Platform.OS === 'ios') {
    return {
      shadowColor: shadow.shadowColor,
      shadowOffset: shadow.shadowOffset,
      shadowOpacity: shadow.shadowOpacity,
      shadowRadius: shadow.shadowRadius,
      elevation: 0,
    };
  } else {
    return {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: shadow.elevation,
    };
  }
};

// Get modern shadow utility with fallback for undefined values
export const getModernShadow = (type: keyof typeof modernShadows): Shadow => {
  const shadow = modernShadows[type];
  
  // Defensive coding: if shadow is undefined, return a safe default
  if (!shadow) {
    return shadows.none;
  }

  if (Platform.OS === 'ios') {
    return {
      shadowColor: shadow.shadowColor,
      shadowOffset: shadow.shadowOffset,
      shadowOpacity: shadow.shadowOpacity,
      shadowRadius: shadow.shadowRadius,
      elevation: 0, // iOS doesn't use elevation
    };
  } else {
    return {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: shadow.elevation,
    };
  }
};
