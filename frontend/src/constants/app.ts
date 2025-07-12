import { enableDemoMode } from '@/config/env';

export const APP_CONFIG = {
  NAME: 'Nutrition AI',
  VERSION: '1.0.0',
  DESCRIPTION: 'AI-powered nutritional analysis from food images',
  SUPPORT_EMAIL: 'support@nutritionai.com',
  PRIVACY_POLICY_URL: 'https://nutritionai.com/privacy',
  TERMS_OF_SERVICE_URL: 'https://nutritionai.com/terms',
  ENABLE_DEMO_MODE: enableDemoMode,
};

export const API_CONFIG = {
  TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
};

export const CAMERA_CONFIG = {
  QUALITY: 0.8,
  ASPECT_RATIO: [4, 3] as [number, number],
  ALLOW_EDITING: true,
  MEDIA_TYPES: 'Images' as const,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  SUPPORTED_FORMATS: ['jpg', 'jpeg', 'png', 'heic'],
};

export const VALIDATION_CONFIG = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 20,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  THEME_MODE: 'theme_mode',
  LANGUAGE: 'language',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  LAST_SYNC: 'last_sync',
} as const;

export const MEAL_TYPES = {
  BREAKFAST: 'breakfast',
  LUNCH: 'lunch',
  DINNER: 'dinner',
  SNACK: 'snack',
} as const;

export const MEASUREMENT_SYSTEMS = {
  METRIC: 'metric',
  IMPERIAL: 'imperial',
} as const;

export const DIETARY_RESTRICTIONS = {
  VEGETARIAN: 'vegetarian',
  VEGAN: 'vegan',
  GLUTEN_FREE: 'gluten_free',
  DAIRY_FREE: 'dairy_free',
  KETO: 'keto',
  PALEO: 'paleo',
  LOW_CARB: 'low_carb',
  LOW_FAT: 'low_fat',
  HALAL: 'halal',
  KOSHER: 'kosher',
} as const;

export const NOTIFICATION_TYPES = {
  MEAL_REMINDER: 'meal_reminder',
  DAILY_SUMMARY: 'daily_summary',
  WEEKLY_REPORT: 'weekly_report',
  ACHIEVEMENT: 'achievement',
  STREAK_MILESTONE: 'streak_milestone',
} as const;

export const ACTIVITY_LEVELS = {
  SEDENTARY: 'sedentary',
  LIGHTLY_ACTIVE: 'lightly_active',
  MODERATELY_ACTIVE: 'moderately_active',
  VERY_ACTIVE: 'very_active',
  EXTRA_ACTIVE: 'extra_active',
} as const;

export const GOALS = {
  WEIGHT_LOSS: 'weight_loss',
  WEIGHT_GAIN: 'weight_gain',
  MAINTENANCE: 'maintenance',
  MUSCLE_GAIN: 'muscle_gain',
} as const;

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  UNAUTHORIZED: 'Your session has expired. Please login again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  CAMERA_PERMISSION: 'Camera permission is required to take photos.',
  GALLERY_PERMISSION: 'Gallery permission is required to select photos.',
  GENERIC_ERROR: 'Something went wrong. Please try again.',
} as const;

export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful!',
  REGISTER_SUCCESS: 'Registration successful!',
  LOGOUT_SUCCESS: 'Logout successful!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  MEAL_SAVED: 'Meal saved successfully!',
  MEAL_DELETED: 'Meal deleted successfully!',
  FAVORITE_ADDED: 'Added to favorites!',
  FAVORITE_REMOVED: 'Removed from favorites!',
} as const;

export const LOADING_MESSAGES = {
  ANALYZING_IMAGE: 'Analyzing your meal...',
  SAVING_MEAL: 'Saving meal...',
  LOADING_HISTORY: 'Loading meal history...',
  UPDATING_PROFILE: 'Updating profile...',
  LOGGING_IN: 'Logging in...',
  REGISTERING: 'Creating account...',
  PREPARING_CAMERA: 'Preparing camera...',
} as const;
