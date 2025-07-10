// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, any>;
  errors?: Record<string, string[]>;
  timestamp?: string;
  path?: string;
}

// Authentication Types
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  passwordConfirm: string;
  firstName: string;
  lastName: string;
  accountType?: 'free' | 'premium' | 'professional';
  marketingConsent?: boolean;
  termsAccepted: boolean;
}

export interface TokenPair {
  access: string;
  refresh: string;
  accessExpiresAt?: string;
  refreshExpiresAt?: string;
}

export interface AuthResponse {
  user: import('./models').User;
  tokens: TokenPair;
  profile?: import('./models').UserProfile;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  password: string;
  passwordConfirm: string;
}

export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
}

export interface EmailVerification {
  token: string;
}

// Two-Factor Authentication Types
export interface TwoFactorSetupRequest {
  device_name?: string;
}

export interface TwoFactorSetupResponse {
  device_id: number;
  message: string;
  secret?: string;
  qr_code?: string;
  backup_codes?: string[];
  manual_entry_key?: string;
}

export interface TwoFactorVerifyRequest {
  device_id?: number;
  totp_code?: string;
  backup_code?: string;
  session_token?: string;
}

export interface TwoFactorVerifyResponse {
  message: string;
  backup_codes?: string[];
  user?: import('./models').User;
  tokens?: TokenPair;
  profile?: import('./models').UserProfile;
  requires_2fa?: boolean;
  session_token?: string;
}

export interface TwoFactorQRCodeResponse {
  qr_code: string;
  secret: string;
  provisioning_uri: string;
}

export interface TwoFactorBackupCodesResponse {
  count: number;
  message: string;
  backup_codes?: string[];
}

// Social Authentication Types
export interface GoogleLoginRequest {
  access_token?: string;
  id_token?: string;
  code?: string;
}

export interface SocialAuthResponse {
  user: import('./models').User;
  tokens?: TokenPair;
  profile?: import('./models').UserProfile;
  is_new_user: boolean;
  social_account: SocialAccountInfo;
}

export interface SocialAccountInfo {
  id: string;
  provider: string;
  provider_id: string;
  email: string;
  name: string;
  avatar_url?: string;
  extra_data: Record<string, any>;
  created_at: string;
}

export interface SocialLinkRequest {
  access_token?: string;
  id_token?: string;
  code?: string;
}

// AI Analysis Types
export interface AnalysisRequest {
  imageUri: string;
  metadata?: {
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';
    cuisine?: string;
    location?: {
      latitude: number;
      longitude: number;
    };
    timezone?: string;
  };
}

export interface AnalysisResult {
  meal: import('./models').Meal;
  analysis: import('./models').MealAnalysis;
  suggestions?: string[];
}

export interface RecalculateRequest {
  mealId: string;
  items: Array<{
    foodItemId?: string;
    name: string;
    quantity: number;
    unit: string;
  }>;
}

export interface RecalculateResult {
  meal: import('./models').Meal;
  nutrition: import('./models').NutritionalInfo;
  changes: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

// Meal Management Types
export interface CreateMealData {
  name: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';
  consumedAt?: string;
  image?: string;
  notes?: string;
  location?: string;
  mealItems: Array<{
    foodItemId: string;
    quantity: number;
    unit: string;
  }>;
}

export interface UpdateMealData {
  name?: string;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';
  consumedAt?: string;
  notes?: string;
  location?: string;
  mealItems?: Array<{
    id?: string;
    foodItemId: string;
    quantity: number;
    unit: string;
  }>;
}

export interface MealFilters {
  startDate?: string;
  endDate?: string;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';
  isFavorite?: boolean;
  search?: string;
  minCalories?: number;
  maxCalories?: number;
  tags?: string[];
  ordering?: 'consumed_at' | '-consumed_at' | 'calories' | '-calories' | 'created_at' | '-created_at';
  page?: number;
  pageSize?: number;
}

export interface QuickLogRequest {
  mealId: string;
  consumedAt?: string;
}

// Food Item Types
export interface CreateFoodItemData {
  name: string;
  brand?: string;
  barcode?: string;
  category?: string;
  description?: string;
  
  // Nutrition per 100g
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  
  // Serving info
  servingSize: number;
  servingUnit: string;
  
  isPublic?: boolean;
}

export interface FoodItemFilters {
  search?: string;
  category?: string;
  brand?: string;
  source?: 'ai' | 'database' | 'manual' | 'usda';
  isPublic?: boolean;
  minCalories?: number;
  maxCalories?: number;
  page?: number;
  pageSize?: number;
}

// User Profile Types
export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  bio?: string;
  gender?: 'male' | 'female' | 'other';
  height?: number;
  weight?: number;
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  
  // Goals
  dailyCalorieGoal?: number;
  dailyProteinGoal?: number;
  dailyCarbsGoal?: number;
  dailyFatGoal?: number;
  
  // Preferences
  timezone?: string;
  language?: string;
  measurementSystem?: 'metric' | 'imperial';
  receiveEmailNotifications?: boolean;
  receivePushNotifications?: boolean;
  
  // Privacy
  profileVisibility?: 'public' | 'private' | 'friends';
  dataSharing?: 'none' | 'anonymous' | 'full';
}

export interface AddDietaryRestriction {
  name: string;
  restrictionType: 'allergy' | 'intolerance' | 'preference' | 'religious' | 'medical';
  description?: string;
  severity?: 'mild' | 'moderate' | 'severe';
}

// Health Check Types
export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version?: string;
}

export interface ReadinessStatus {
  database: boolean;
  cache: boolean;
  storage: boolean;
  external_apis: {
    gemini: boolean;
  };
  timestamp: string;
}

export interface ApiMetrics {
  requests_total: number;
  requests_success: number;
  requests_failed: number;
  average_response_time: number;
  active_users: number;
  timestamp: string;
}

// Notification Types
export interface Notification {
  id: string;
  user: string;
  title: string;
  message: string;
  notification_type: 'meal_reminder' | 'daily_summary' | 'weekly_report' | 'achievement' | 'streak' | 'tip' | 'system' | 'promotional';
  channel: 'in_app' | 'email' | 'push';
  is_read: boolean;
  action_url?: string;
  action_data?: Record<string, any>;
  scheduled_for?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationListResponse extends PaginatedResponse<Notification> {
  unread_count: number;
}

export interface NotificationPreferences {
  id: string;
  user: string;
  
  // Email preferences
  email_daily_summary: boolean;
  email_weekly_report: boolean;
  email_tips: boolean;
  email_achievements: boolean;
  email_streak_milestones: boolean;
  
  // Push notification preferences
  push_meal_reminders: boolean;
  push_daily_summary: boolean;
  push_achievements: boolean;
  push_streak_milestones: boolean;
  push_tips: boolean;
  
  // In-app notification preferences
  in_app_meal_reminders: boolean;
  in_app_daily_summary: boolean;
  in_app_achievements: boolean;
  in_app_streak_milestones: boolean;
  in_app_tips: boolean;
  
  // Meal reminder times
  meal_reminder_times: string[];
  
  // Timezone for scheduling
  timezone: string;
  
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationRequest {
  title: string;
  message: string;
  notification_type: string;
  channel: 'in_app' | 'email' | 'push';
  action_url?: string;
  action_data?: Record<string, any>;
  scheduled_for?: string;
  target_users?: string[];
}

export interface UpdateNotificationPreferencesRequest {
  email_daily_summary?: boolean;
  email_weekly_report?: boolean;
  email_tips?: boolean;
  email_achievements?: boolean;
  email_streak_milestones?: boolean;
  push_meal_reminders?: boolean;
  push_daily_summary?: boolean;
  push_achievements?: boolean;
  push_streak_milestones?: boolean;
  push_tips?: boolean;
  in_app_meal_reminders?: boolean;
  in_app_daily_summary?: boolean;
  in_app_achievements?: boolean;
  in_app_streak_milestones?: boolean;
  in_app_tips?: boolean;
  meal_reminder_times?: string[];
  timezone?: string;
}

// Pagination utility type
export interface PaginationParams {
  page?: number;
  page_size?: number;
}