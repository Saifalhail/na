// Re-export all types for easy importing
export * from './models';
export * from './api';
export * from './navigation';

// Common utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

// Form types
export interface FormError {
  field: string;
  message: string;
}

export interface FormState<T> {
  values: T;
  errors: Record<keyof T, string | undefined>;
  touched: Record<keyof T, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
}

// Component prop types
export interface BaseComponentProps {
  testID?: string;
  className?: string;
}

// Image types
export interface ImageSource {
  uri: string;
  width?: number;
  height?: number;
}

// Status types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

// Date/Time types
export type DateString = string; // ISO 8601 format
export type TimeString = string; // HH:mm format

// Pagination types
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Sort types
export type SortDirection = 'asc' | 'desc';

export interface SortParams<T> {
  field: keyof T;
  direction: SortDirection;
}

// Filter types
export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';

export interface Filter<T> {
  field: keyof T;
  operator: FilterOperator;
  value: any;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  retry?: boolean;
}

// Storage types
export interface StorageItem<T> {
  key: string;
  value: T;
  expiresAt?: number;
}

// Theme types
export type ThemeMode = 'light' | 'dark' | 'system';

// Platform types
export type Platform = 'ios' | 'android' | 'web';

// Device types
export interface DeviceInfo {
  platform: Platform;
  version: string;
  model: string;
  isTablet: boolean;
}

// Network types
export type NetworkStatus = 'online' | 'offline' | 'unknown';

// Permission types
export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface Permissions {
  camera: PermissionStatus;
  photoLibrary: PermissionStatus;
  notifications: PermissionStatus;
  location: PermissionStatus;
}

// Analytics types
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: number;
}

// Feature flags
export interface FeatureFlags {
  enableAnalytics: boolean;
  enableCrashReporting: boolean;
  enableOfflineMode: boolean;
  enableSocialLogin: boolean;
  enableBiometricAuth: boolean;
}