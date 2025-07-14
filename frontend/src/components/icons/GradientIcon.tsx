import React from 'react';
import { View, ViewStyle } from 'react-native';
import { Ionicons } from '@/components/IconFallback';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';

// Safely import MaskedView with fallback
let MaskedView: any = null;
try {
  MaskedView = require('@react-native-masked-view/masked-view').default;
} catch (error) {
  console.warn('MaskedView not available, using fallback for gradient icons');
}

interface GradientIconProps {
  name: string;
  size?: number;
  colors?: string[];
  style?: ViewStyle;
  fallbackColor?: string;
}

export const GradientIcon: React.FC<GradientIconProps> = ({
  name,
  size = 24,
  colors,
  style,
  fallbackColor,
}) => {
  const { theme } = useTheme();

  const defaultColors = theme.isDark
    ? [theme.colors.primary[400], theme.colors.primary[600]]
    : [theme.colors.primary[500], theme.colors.primary[700]];

  const gradientColors = colors || defaultColors;
  const fallback = fallbackColor || theme.colors.primary[500];

  // Use MaskedView for gradient effect if available, otherwise fallback
  if (MaskedView) {
    try {
      return (
        <View style={[{ width: size, height: size }, style]}>
          <MaskedView
            style={{ width: size, height: size }}
            maskElement={
              <Ionicons
                name={name}
                size={size}
                color="white"
                style={{ backgroundColor: 'transparent' }}
              />
            }
          >
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: size, height: size }}
            />
          </MaskedView>
        </View>
      );
    } catch (error) {
      console.warn('MaskedView failed at runtime, using fallback');
    }
  }

  // Fallback: Create a simple gradient background with icon overlay
  return (
    <View style={[{ width: size, height: size }, style]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 8,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Ionicons 
          name={name} 
          size={size * 0.6} 
          color="white" 
          style={{ opacity: 0.9 }}
        />
      </LinearGradient>
    </View>
  );
};

// Premium icon presets
export const PremiumIconPresets = {
  primary: (theme: Theme) => 
    theme.isDark
      ? [theme.colors.primary[400], theme.colors.primary[600]]
      : [theme.colors.primary[500], theme.colors.primary[700]],
  
  success: (theme: Theme) =>
    theme.isDark
      ? [theme.colors.success[400], theme.colors.success[600]]
      : [theme.colors.success[500], theme.colors.success[700]],
  
  warning: (theme: Theme) =>
    theme.isDark
      ? [theme.colors.warning[400], theme.colors.warning[600]]
      : [theme.colors.warning[500], theme.colors.warning[700]],
  
  error: (theme: Theme) =>
    theme.isDark
      ? [theme.colors.error[400], theme.colors.error[600]]
      : [theme.colors.error[500], theme.colors.error[700]],
  
  premium: (theme: Theme) =>
    theme.isDark
      ? ['#FFD700', '#FFA500', '#FF6347']
      : ['#FFD700', '#FF8C00', '#FF6347'],
  
  cool: (theme: Theme) =>
    theme.isDark
      ? ['#00D9FF', '#0099FF', '#0066FF']
      : ['#00BFFF', '#0080FF', '#0040FF'],
  
  warm: (theme: Theme) =>
    theme.isDark
      ? ['#FF6B6B', '#FF8E53', '#FFB74D']
      : ['#FF5252', '#FF6E40', '#FFA726'],
};

export default GradientIcon;