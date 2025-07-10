import { NavigatorScreenParams } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Meal, FoodItem } from './models';

// Root Stack Navigator
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  Onboarding: undefined;
  Camera: {
    source: 'tab' | 'meal' | 'quick';
  };
  MealDetail: {
    mealId: string;
  };
  EditMeal: {
    mealId?: string;
    meal?: Meal;
  };
  FoodSearch: {
    onSelect: (foodItem: FoodItem) => void;
  };
  Settings: undefined;
};

// Auth Stack Navigator
export type AuthStackParamList = {
  Welcome: undefined;
  Login: {
    email?: string;
  };
  Register: undefined;
  ForgotPassword: undefined;
  VerifyEmail: {
    email: string;
  };
  ResetPassword: {
    token: string;
  };
};

// Main Tab Navigator
export type MainTabParamList = {
  Home: undefined;
  Meals: undefined;
  Capture: undefined;
  Favorites: undefined;
  Profile: undefined;
};

// Meals Stack Navigator
export type MealsStackParamList = {
  MealsList: undefined;
  MealCalendar: undefined;
  MealStatistics: undefined;
};

// Profile Stack Navigator
export type ProfileStackParamList = {
  ProfileMain: undefined;
  EditProfile: undefined;
  DietaryRestrictions: undefined;
  Goals: undefined;
  Privacy: undefined;
  Notifications: undefined;
};

// Screen Props Types
export type RootStackScreenProps<T extends keyof RootStackParamList> = StackScreenProps<
  RootStackParamList,
  T
>;

export type AuthStackScreenProps<T extends keyof AuthStackParamList> = StackScreenProps<
  AuthStackParamList,
  T
>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = BottomTabScreenProps<
  MainTabParamList,
  T
>;

export type MealsStackScreenProps<T extends keyof MealsStackParamList> = StackScreenProps<
  MealsStackParamList,
  T
>;

export type ProfileStackScreenProps<T extends keyof ProfileStackParamList> = StackScreenProps<
  ProfileStackParamList,
  T
>;

// Navigation Types
export interface NavigationTheme {
  dark: boolean;
  colors: {
    primary: string;
    background: string;
    card: string;
    text: string;
    border: string;
    notification: string;
  };
}