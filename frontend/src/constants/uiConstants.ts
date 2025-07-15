import { ViewStyle } from 'react-native';

export const UI = {
  // Border Radius
  cardRadius: 16,
  buttonRadius: 12,
  avatarRadius: 30,
  logoRadius: 20,
  
  // Padding
  cardPadding: 20,
  buttonPadding: {
    vertical: 16,
    horizontal: 24,
  },
  screenPadding: 16,
  
  // Icon Sizes
  iconSizes: {
    small: 20,
    medium: 24,
    large: 28,
    xlarge: 32,
  },
  
  // Card Dimensions
  macroCardWidth: '32%',
  macroCardHeight: 120,
  statCardSize: 100,
  statCardWidth: '48%',
  
  // Logo Dimensions
  logoSize: 40,
  logoContainerSize: 44,
  
  // Gradient Colors
  gradientColors: {
    blue: ['#3B82F6', '#2563EB'],
    blueLight: ['#60A5FA', '#3B82F6'],
    white: ['#FFFFFF', '#F8FAFF'],
    green: ['#22C55E', '#16A34A'],
  },
  
  // Premium Shadows
  shadows: {
    premium: {
      shadowColor: '#3B82F6',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 10,
    } as ViewStyle,
    
    subtle: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3,
    } as ViewStyle,
    
    card: {
      shadowColor: '#3B82F6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 6,
    } as ViewStyle,
    
    button: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 4,
    } as ViewStyle,
  },
  
  // Animation Durations
  animations: {
    fast: 200,
    normal: 300,
    slow: 500,
  },
  
  // Z-Index Layers
  zIndex: {
    base: 0,
    card: 1,
    dropdown: 10,
    modal: 100,
    toast: 1000,
  },
};