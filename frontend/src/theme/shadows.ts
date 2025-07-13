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
  sm: Shadow;
  base: Shadow;
  md: Shadow;
  lg: Shadow;
  xl: Shadow;
}

const createShadow = (
  offsetHeight: number,
  radius: number,
  opacity: number,
  elevation: number
): Shadow => ({
  shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: offsetHeight,
  },
  shadowOpacity: opacity,
  shadowRadius: radius,
  elevation: Platform.OS === 'android' ? elevation : 0,
});

export const shadows: ShadowScale = {
  none: createShadow(0, 0, 0, 0),
  sm: createShadow(1, 2, 0.08, 2),
  base: createShadow(2, 4, 0.12, 4),
  md: createShadow(4, 8, 0.15, 8),
  lg: createShadow(8, 16, 0.18, 12),
  xl: createShadow(16, 24, 0.2, 16),
};

// Modern shadow utilities for enhanced design
export const modernShadows = {
  button: {
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  floating: {
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
};

// Platform-specific shadow utilities
export const getShadow = (level: keyof ShadowScale): Shadow => {
  const shadow = shadows[level];

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

// Get modern shadow utility
export const getModernShadow = (type: keyof typeof modernShadows): Shadow => {
  const shadow = modernShadows[type];
  
  if (Platform.OS === 'ios') {
    return shadow;
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
