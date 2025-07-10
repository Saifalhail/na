export const API_CONFIG = {
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000',
  version: process.env.EXPO_PUBLIC_API_VERSION || 'v1',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
};

export const API_ENDPOINTS = {
  // Authentication
  auth: {
    register: '/auth/register/',
    login: '/auth/login/',
    logout: '/auth/logout/',
    refresh: '/auth/refresh/',
    verify: '/auth/verify/',
    verifyEmail: '/auth/verify-email/',
    passwordReset: '/auth/password/reset/',
    passwordResetConfirm: '/auth/password/reset/confirm/',
    passwordChange: '/auth/password/change/',
    profile: '/auth/profile/',
  },
  
  // Social Authentication
  social: {
    google: '/auth/social/google/',
    apple: '/auth/social/apple/',
  },
  
  // Two-Factor Authentication
  twoFactor: {
    setup: '/auth/2fa/enable/',
    verify: '/auth/2fa/verify/',
    complete: '/auth/2fa/complete/',
    disable: '/auth/2fa/disable/',
    status: '/auth/2fa/status/',
    qrCode: '/auth/2fa/qr-code/',
    backupCodes: '/auth/2fa/backup-codes/',
    generateBackupCodes: '/auth/2fa/backup-codes/',
  },
  
  // AI Analysis
  ai: {
    analyze: '/ai/analyze/',
    recalculate: '/ai/recalculate/',
  },
  
  // Meals
  meals: {
    list: '/meals/',
    detail: (id: string) => `/meals/${id}/`,
    favorite: (id: string) => `/meals/${id}/favorite/`,
    unfavorite: (id: string) => `/meals/${id}/unfavorite/`,
    duplicate: (id: string) => `/meals/${id}/duplicate/`,
    similar: (id: string) => `/meals/${id}/similar/`,
    favorites: '/meals/favorites/',
    statistics: '/meals/statistics/',
    quickLog: '/meals/quick_log/',
  },
  
  // Food Items
  foodItems: {
    list: '/food-items/',
    detail: (id: string) => `/food-items/${id}/`,
    search: '/food-items/search/',
  },
  
  // Notifications
  notifications: {
    list: '/notifications/',
    detail: (id: string) => `/notifications/${id}/`,
    markAsRead: (id: string) => `/notifications/${id}/mark_as_read/`,
    markAllAsRead: '/notifications/mark_all_as_read/',
    preferences: '/notifications/preferences/',
    adminCreate: '/notifications/admin/create/',
  },
  
  // Health Checks
  health: {
    check: '/health/',
    ready: '/ready/',
    live: '/live/',
    metrics: '/metrics/',
  },
};

export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.baseURL}/api/${API_CONFIG.version}${endpoint}`;
};

export const getFullUrl = (endpoint: string): string => {
  return `${API_CONFIG.baseURL}${endpoint}`;
};

// Rate limiting configurations
export const RATE_LIMITS = {
  auth: {
    maxRequests: 5,
    windowMs: 60000, // 1 minute
  },
  ai: {
    maxRequests: 10,
    windowMs: 60000, // 1 minute
  },
  general: {
    maxRequests: 60,
    windowMs: 60000, // 1 minute
  },
};