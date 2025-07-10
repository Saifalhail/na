import { Platform, Dimensions, PixelRatio } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const PlatformUtils = {
  /**
   * Platform checks
   */
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
  isWeb: Platform.OS === 'web',

  /**
   * Version checks
   */
  iosVersion: Platform.OS === 'ios' ? parseInt(Platform.Version as string, 10) : 0,
  androidVersion: Platform.OS === 'android' ? Platform.Version : 0,

  /**
   * Device type checks
   */
  isTablet: Device.deviceType === Device.DeviceType.TABLET,
  isPhone: Device.deviceType === Device.DeviceType.PHONE,

  /**
   * Screen dimensions
   */
  screenWidth,
  screenHeight,
  pixelRatio: PixelRatio.get(),
  fontScale: PixelRatio.getFontScale(),

  /**
   * Safe area helpers
   */
  statusBarHeight: Constants.statusBarHeight,

  /**
   * Platform-specific values
   */
  select: <T>(options: { ios?: T; android?: T; default?: T }): T | undefined => {
    return Platform.select(options);
  },

  /**
   * Feature availability
   */
  features: {
    hasNotch: Platform.OS === 'ios' && Device.modelName?.includes('X'),
    hasDynamicIsland:
      Platform.OS === 'ios' &&
      (Device.modelName?.includes('14 Pro') || Device.modelName?.includes('15 Pro')),
    hasHaptics: Platform.OS === 'ios' || (Platform.OS === 'android' && Platform.Version >= 26),
    hasWidgets: Platform.OS === 'android' && Platform.Version >= 26,
    hasLiveActivities: Platform.OS === 'ios' && parseInt(Platform.Version as string, 10) >= 16,
  },

  /**
   * Performance helpers
   */
  shouldReduceMotion: false, // This would need to be checked via native module
  isLowEndDevice: Device.totalMemory ? Device.totalMemory < 2 * 1024 * 1024 * 1024 : false,
};

/**
 * Platform-specific shadow styles
 */
export const PlatformShadow = {
  light: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    android: {
      elevation: 2,
    },
  }),

  medium: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
    },
    android: {
      elevation: 4,
    },
  }),

  heavy: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    },
    android: {
      elevation: 8,
    },
  }),
};

/**
 * Platform-specific animations
 */
export const PlatformAnimations = {
  /**
   * Spring animation config
   */
  spring: Platform.select({
    ios: {
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    },
    android: {
      friction: 7,
      tension: 40,
      useNativeDriver: true,
    },
  }),

  /**
   * Timing animation config
   */
  timing: {
    fast: 200,
    normal: 300,
    slow: 500,
  },
};

/**
 * Platform-specific keyboard config
 */
export const PlatformKeyboard = {
  keyboardVerticalOffset: Platform.select({
    ios: 0,
    android: -200,
  }),

  keyboardAvoidingViewBehavior: Platform.select({
    ios: 'padding' as const,
    android: 'height' as const,
  }),
};

/**
 * Platform-specific storage limits
 */
export const PlatformStorage = {
  maxImageSize: Platform.select({
    ios: 10 * 1024 * 1024, // 10MB
    android: 5 * 1024 * 1024, // 5MB
  }),

  maxCacheSize: Platform.select({
    ios: 100 * 1024 * 1024, // 100MB
    android: 50 * 1024 * 1024, // 50MB
  }),
};

/**
 * Platform-specific permissions
 */
export const PlatformPermissions = {
  camera: {
    title: 'Camera Permission',
    message: Platform.select({
      ios: 'This app needs access to your camera to take photos of your meals.',
      android: 'Allow this app to take pictures?',
    }),
  },

  gallery: {
    title: 'Photo Library Permission',
    message: Platform.select({
      ios: 'This app needs access to your photo library to select meal images.',
      android: 'Allow this app to access your photos?',
    }),
  },

  notifications: {
    title: 'Notification Permission',
    message: Platform.select({
      ios: 'This app would like to send you notifications about your nutrition goals.',
      android: 'Allow this app to send notifications?',
    }),
  },
};
