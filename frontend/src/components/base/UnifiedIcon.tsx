import React from 'react';
import { View, ViewStyle } from 'react-native';
import { Ionicons } from '@/components/IconFallback';
import { LinearGradient } from 'expo-linear-gradient';
import { UI } from '@/constants/uiConstants';
import { useTheme } from '@/hooks/useTheme';

export type IconSize = 'small' | 'medium' | 'large' | 'xlarge';
export type IconVariant = 'default' | 'gradient' | 'white' | 'primary';

interface UnifiedIconProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: IconSize;
  variant?: IconVariant;
  color?: string;
  containerStyle?: ViewStyle;
  withBackground?: boolean;
  focused?: boolean;
}

export const UnifiedIcon: React.FC<UnifiedIconProps> = ({
  name,
  size = 'medium',
  variant = 'default',
  color,
  containerStyle,
  withBackground = false,
  focused = false,
}) => {
  const { theme } = useTheme();

  const getIconSize = (): number => {
    return UI.iconSizes[size];
  };

  const getIconColor = (): string => {
    if (color) return color;

    switch (variant) {
      case 'white':
        return '#FFFFFF';
      case 'primary':
        return UI.gradientColors.blue[0];
      case 'gradient':
        return UI.gradientColors.blue[0]; // Fallback for gradient
      default:
        return focused 
          ? UI.gradientColors.blue[0] 
          : theme.isDark ? '#FFFFFF' : '#000000';
    }
  };

  const renderIcon = () => {
    const iconElement = (
      <Ionicons
        name={name}
        size={getIconSize()}
        color={getIconColor()}
      />
    );

    if (variant === 'gradient') {
      return (
        <View style={{ position: 'relative' }}>
          <LinearGradient
            colors={UI.gradientColors.blue}
            style={{
              position: 'absolute',
              width: getIconSize(),
              height: getIconSize(),
            }}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          {iconElement}
        </View>
      );
    }

    return iconElement;
  };

  if (withBackground) {
    const backgroundSize = getIconSize() + 16;
    return (
      <View
        style={[
          {
            width: backgroundSize,
            height: backgroundSize,
            borderRadius: backgroundSize / 2,
            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(59, 130, 246, 0.1)',
            alignItems: 'center',
            justifyContent: 'center',
          },
          containerStyle,
        ]}
      >
        {renderIcon()}
      </View>
    );
  }

  if (containerStyle) {
    return <View style={containerStyle}>{renderIcon()}</View>;
  }

  return renderIcon();
};

// Predefined icon mappings for consistency
export const UNIFIED_ICONS = {
  // Navigation
  home: 'home',
  homeOutline: 'home-outline',
  history: 'time',
  historyOutline: 'time-outline',
  camera: 'camera',
  favorites: 'heart',
  favoritesOutline: 'heart-outline',
  settings: 'settings',
  settingsOutline: 'settings-outline',
  
  // Actions
  notifications: 'notifications',
  notificationsOutline: 'notifications-outline',
  profile: 'person',
  profileOutline: 'person-outline',
  
  // Stats
  water: 'water',
  waterOutline: 'water-outline',
  sleep: 'moon',
  sleepOutline: 'moon-outline',
  steps: 'walk',
  stepsOutline: 'walk-outline',
  meals: 'restaurant',
  mealsOutline: 'restaurant-outline',
  
  // UI Elements
  close: 'close',
  check: 'checkmark',
  add: 'add',
  remove: 'remove',
  edit: 'create',
  delete: 'trash',
  search: 'search',
  filter: 'filter',
  menu: 'menu',
  more: 'ellipsis-horizontal',
  back: 'arrow-back',
  forward: 'arrow-forward',
  up: 'arrow-up',
  down: 'arrow-down',
  
  // Features
  scan: 'scan',
  flash: 'flash',
  flashOff: 'flash-off',
  image: 'image',
  info: 'information-circle',
  warning: 'warning',
  error: 'alert-circle',
  success: 'checkmark-circle',
} as const;