import { Dimensions, Platform, PixelRatio } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Base dimensions (iPhone 14 Pro)
const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

// Responsive scaling functions
export const scale = (size: number): number => {
  return (screenWidth / BASE_WIDTH) * size;
};

export const verticalScale = (size: number): number => {
  return (screenHeight / BASE_HEIGHT) * size;
};

export const moderateScale = (size: number, factor = 0.5): number => {
  return size + (scale(size) - size) * factor;
};

// Font scaling with pixel ratio consideration
export const fontScale = (size: number): number => {
  const scaledSize = scale(size);
  const pixelRatio = PixelRatio.getFontScale();
  return Math.round(scaledSize / pixelRatio);
};

// Consistent spacing system
export const spacing = {
  tiny: 4,
  small: 8,
  medium: 16,
  large: 24,
  xlarge: 32,
  xxlarge: 48,
} as const;

// Responsive spacing
export const rs = {
  tiny: moderateScale(spacing.tiny),
  small: moderateScale(spacing.small),
  medium: moderateScale(spacing.medium),
  large: moderateScale(spacing.large),
  xlarge: moderateScale(spacing.xlarge),
  xxlarge: moderateScale(spacing.xxlarge),
} as const;

// Touch target sizes (minimum 44x44 as per Apple/Google guidelines)
export const TOUCH_TARGET = {
  minimum: 44,
  small: 48,
  medium: 56,
  large: 64,
} as const;

// Responsive touch targets
export const rTouchTarget = {
  minimum: moderateScale(TOUCH_TARGET.minimum),
  small: moderateScale(TOUCH_TARGET.small),
  medium: moderateScale(TOUCH_TARGET.medium),
  large: moderateScale(TOUCH_TARGET.large),
} as const;

// Safe area padding helpers
export const getSafeAreaPadding = (insets: { top: number; bottom: number; left: number; right: number }) => {
  return {
    paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 20 : 0),
    paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 0 : 20),
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };
};

// Common responsive dimensions
export const dimensions = {
  screenWidth,
  screenHeight,
  isSmallDevice: screenWidth < 375,
  isMediumDevice: screenWidth >= 375 && screenWidth < 414,
  isLargeDevice: screenWidth >= 414,
  isTablet: screenWidth >= 768,
} as const;

// Responsive border radius
export const borderRadius = {
  small: moderateScale(4),
  medium: moderateScale(8),
  large: moderateScale(12),
  xlarge: moderateScale(16),
  round: 9999,
} as const;

// Layout helpers
export const layout = {
  // Container padding that scales with screen size
  containerPadding: dimensions.isSmallDevice ? rs.medium : rs.large,
  
  // Card padding
  cardPadding: rs.medium,
  
  // Section spacing
  sectionSpacing: rs.xlarge,
  
  // Maximum content width for tablets
  maxContentWidth: dimensions.isTablet ? 600 : '100%' as const,
} as const;

// Animation durations
export const animationDuration = {
  fast: 200,
  normal: 300,
  slow: 500,
} as const;

// Z-index layers
export const zIndex = {
  base: 0,
  card: 1,
  dropdown: 10,
  modal: 100,
  toast: 200,
  overlay: 300,
} as const;