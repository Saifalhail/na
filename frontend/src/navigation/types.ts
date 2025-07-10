import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, RouteProp } from '@react-navigation/native';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  TwoFactorSetup: undefined;
  TwoFactorVerify: { secret: string };
};

export type MainStackParamList = {
  HomeTabs: undefined;
  Camera: undefined;
  AnalysisResults: {
    imageUri: string;
    analysisData?: any;
  };
  Profile: undefined;
};

export type HomeTabParamList = {
  Home: undefined;
  History: undefined;
  Favorites: undefined;
};

// Navigation props for Auth screens
export type AuthNavigationProp = StackNavigationProp<AuthStackParamList>;

// Navigation props for Main screens
export type MainNavigationProp = CompositeNavigationProp<
  StackNavigationProp<MainStackParamList>,
  BottomTabNavigationProp<HomeTabParamList>
>;

// Navigation props for Tab screens
export type HomeTabNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<HomeTabParamList>,
  StackNavigationProp<MainStackParamList>
>;

// Route props
export type AuthRouteProp<T extends keyof AuthStackParamList> = RouteProp<AuthStackParamList, T>;

export type MainRouteProp<T extends keyof MainStackParamList> = RouteProp<MainStackParamList, T>;

export type HomeTabRouteProp<T extends keyof HomeTabParamList> = RouteProp<HomeTabParamList, T>;
