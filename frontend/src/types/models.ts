// User and Authentication Types
export interface User {
  id: string;
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  accountType: 'free' | 'premium' | 'professional';
  isVerified: boolean;
  isActive: boolean;
  dateJoined: string;
  lastLogin?: string;
}

export interface UserProfile {
  user: User;
  bio?: string;
  gender?: 'male' | 'female' | 'other';
  height?: number; // in cm
  weight?: number; // in kg
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  dietaryRestrictions: DietaryRestriction[];
  avatar?: string;
  socialAvatarUrl?: string;
  
  // Goals
  dailyCalorieGoal?: number;
  dailyProteinGoal?: number;
  dailyCarbsGoal?: number;
  dailyFatGoal?: number;
  
  // Preferences
  timezone: string;
  language: string;
  measurementSystem: 'metric' | 'imperial';
  receiveEmailNotifications: boolean;
  receivePushNotifications: boolean;
  
  // Privacy
  profileVisibility: 'public' | 'private' | 'friends';
  dataSharing: 'none' | 'anonymous' | 'full';
  
  // Computed properties
  bmi?: number;
  bmr?: number;
  tdee?: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface DietaryRestriction {
  id: string;
  name: string;
  restrictionType: 'allergy' | 'intolerance' | 'preference' | 'religious' | 'medical';
  description?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  createdAt: string;
}

// Food and Nutrition Types
export interface FoodItem {
  id: string;
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
  
  // Additional nutrients
  vitamins?: Record<string, number>;
  minerals?: Record<string, number>;
  
  // Serving info
  servingSize: number;
  servingUnit: string;
  
  // Source
  source: 'ai' | 'database' | 'manual' | 'usda';
  confidence?: number;
  
  // User specific
  userId?: string;
  isPublic: boolean;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// Meal Types
export interface Meal {
  id: string;
  userId: string;
  name: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';
  consumedAt: string;
  image?: string;
  notes?: string;
  location?: string;
  
  // Relations
  mealItems: MealItem[];
  
  // Computed totals
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber?: number;
  totalSugar?: number;
  totalSodium?: number;
  
  // Metadata
  isFavorite: boolean;
  isTemplate: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MealItem {
  id: string;
  foodItem: FoodItem;
  quantity: number;
  unit: string;
  
  // Calculated nutrition based on quantity
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  
  notes?: string;
  order: number;
}

// AI Analysis Types
export interface MealAnalysis {
  id: string;
  mealId: string;
  userId: string;
  imageUrl: string;
  
  // Analysis data
  detectedItems: DetectedFoodItem[];
  confidence: number;
  
  // Context
  metadata?: {
    mealType?: string;
    cuisine?: string;
    location?: string;
    deviceInfo?: string;
  };
  
  // AI Service info
  aiProvider: 'gemini' | 'openai' | 'claude';
  aiModel: string;
  processingTime: number;
  
  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface DetectedFoodItem {
  name: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  quantity?: {
    amount: number;
    unit: string;
  };
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

// Nutritional Information
export interface NutritionalInfo {
  id: string;
  
  // Macronutrients
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  saturatedFat?: number;
  transFat?: number;
  cholesterol?: number;
  sodium?: number;
  
  // Vitamins
  vitaminA?: number;
  vitaminC?: number;
  vitaminD?: number;
  vitaminE?: number;
  vitaminK?: number;
  thiamin?: number;
  riboflavin?: number;
  niacin?: number;
  vitaminB6?: number;
  folate?: number;
  vitaminB12?: number;
  
  // Minerals
  calcium?: number;
  iron?: number;
  magnesium?: number;
  phosphorus?: number;
  potassium?: number;
  zinc?: number;
  
  createdAt: string;
  updatedAt: string;
}

// Favorite Meal
export interface FavoriteMeal {
  id: string;
  userId: string;
  meal: Meal;
  customName?: string;
  quickLogShortcut: boolean;
  order: number;
  createdAt: string;
}

// API Usage Tracking
export interface APIUsageLog {
  id: string;
  userId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  ipAddress: string;
  userAgent?: string;
  requestData?: Record<string, any>;
  errorMessage?: string;
  createdAt: string;
}

// Statistics
export interface MealStatistics {
  totalMeals: number;
  favoriteMeals: number;
  averageCaloriesPerMeal: number;
  averageCaloriesPerDay: number;
  
  macroBreakdown: {
    protein: number;
    carbs: number;
    fat: number;
  };
  
  mealTypeDistribution: {
    breakfast: number;
    lunch: number;
    dinner: number;
    snack: number;
    other: number;
  };
  
  topFoods: Array<{
    foodItem: FoodItem;
    frequency: number;
  }>;
  
  streaks: {
    current: number;
    longest: number;
  };
  
  periodStart: string;
  periodEnd: string;
}