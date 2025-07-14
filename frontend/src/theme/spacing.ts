export interface SpacingScale {
  '0': number;
  '0.5': number;
  '1': number;
  '1.5': number;
  '2': number;
  '2.5': number;
  '3': number;
  '3.5': number;
  '4': number;
  '5': number;
  '6': number;
  '7': number;
  '8': number;
  '9': number;
  '10': number;
  '11': number;
  '12': number;
  '14': number;
  '16': number;
  '20': number;
  '24': number;
  '28': number;
  '32': number;
  '36': number;
  '40': number;
  '44': number;
  '48': number;
  '52': number;
  '56': number;
  '60': number;
  '64': number;
  '72': number;
  '80': number;
  '96': number;
  // Legacy aliases for backward compatibility
  xxs: number;
  xs: number;
  s: number;
  m: number;
  l: number;
  xl: number;
  xxl: number;
}

export const spacing: SpacingScale = {
  // 8pt grid system (base unit = 4px)
  '0': 0,
  '0.5': 2,
  '1': 4,
  '1.5': 6,
  '2': 8,
  '2.5': 10,
  '3': 12,
  '3.5': 14,
  '4': 16,
  '5': 20,
  '6': 24,
  '7': 28,
  '8': 32,
  '9': 36,
  '10': 40,
  '11': 44,
  '12': 48,
  '14': 56,
  '16': 64,
  '20': 80,
  '24': 96,
  '28': 112,
  '32': 128,
  '36': 144,
  '40': 160,
  '44': 176,
  '48': 192,
  '52': 208,
  '56': 224,
  '60': 240,
  '64': 256,
  '72': 288,
  '80': 320,
  '96': 384,
  // Legacy aliases for backward compatibility
  xxs: 2,
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
};

// Grid system based on 8pt grid
export const grid = {
  gutter: spacing['4'], // 16px
  columnGap: spacing['2'], // 8px
  rowGap: spacing['3'], // 12px
  container: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  },
};

// Layout constants for consistent spacing
export const layout = {
  // Screen and container padding
  screenPadding: spacing['4'], // 16px
  screenPaddingLarge: spacing['6'], // 24px
  containerPadding: spacing['4'], // 16px
  sectionSpacing: spacing['8'], // 32px
  
  // Card spacing
  cardPadding: spacing['4'], // 16px
  cardPaddingLarge: spacing['6'], // 24px
  cardMargin: spacing['3'], // 12px
  cardBorderRadius: spacing['2'], // 8px
  cardBorderRadiusLarge: spacing['3'], // 12px
  
  // Button spacing
  buttonPadding: {
    small: {
      horizontal: spacing['3'], // 12px
      vertical: spacing['2'], // 8px
    },
    medium: {
      horizontal: spacing['4'], // 16px
      vertical: spacing['2.5'], // 10px
    },
    large: {
      horizontal: spacing['6'], // 24px
      vertical: spacing['3'], // 12px
    },
  },
  buttonBorderRadius: spacing['2'], // 8px
  buttonBorderRadiusLarge: spacing['3'], // 12px
  
  // Input and form spacing
  inputPadding: {
    horizontal: spacing['3'], // 12px
    vertical: spacing['2.5'], // 10px
  },
  inputMargin: spacing['2'], // 8px
  inputBorderRadius: spacing['2'], // 8px
  formSpacing: spacing['4'], // 16px
  
  // Header and navigation
  headerHeight: spacing['16'], // 64px
  tabBarHeight: spacing['20'], // 80px
  navItemPadding: spacing['3'], // 12px
  
  // List and item spacing
  listItemPadding: {
    horizontal: spacing['4'], // 16px
    vertical: spacing['3'], // 12px
  },
  listItemSpacing: spacing['1'], // 4px
  listSectionSpacing: spacing['6'], // 24px
  
  // Modal and overlay spacing
  modalPadding: spacing['6'], // 24px
  overlayPadding: spacing['4'], // 16px
  
  // Touch targets and accessibility
  minTouchTarget: spacing['11'], // 44px (iOS HIG minimum)
  iconSize: {
    small: spacing['4'], // 16px
    medium: spacing['6'], // 24px
    large: spacing['8'], // 32px
  },
  
  // Common measurements
  borderWidth: {
    thin: 1,
    medium: 2,
    thick: 4,
  },
};
