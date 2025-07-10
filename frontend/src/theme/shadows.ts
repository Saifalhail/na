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
  sm: createShadow(1, 2, 0.05, 1),
  base: createShadow(1, 3, 0.1, 2),
  md: createShadow(4, 6, 0.1, 4),
  lg: createShadow(10, 15, 0.1, 6),
  xl: createShadow(20, 25, 0.1, 8),
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
