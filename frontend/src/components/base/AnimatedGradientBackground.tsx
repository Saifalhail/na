import React, { useEffect, useRef } from 'react';
import { rs } from '@/utils/responsive';
import { StyleSheet, Animated, ViewStyle, Dimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export type GradientType = 'mesh' | 'radial' | 'diagonal' | 'wave' | 'aurora' | 'dynamic';

interface AnimatedGradientBackgroundProps {
  type?: GradientType;
  colors?: readonly [string, string, ...string[]];
  animated?: boolean;
  speed?: 'slow' | 'medium' | 'fast';
  style?: ViewStyle;
  children?: React.ReactNode;
}

export const AnimatedGradientBackground: React.FC<AnimatedGradientBackgroundProps> = ({
  type = 'mesh',
  colors,
  animated = true,
  speed = 'medium',
  style,
  children,
}) => {
  const { theme } = useTheme();
  const animValue1 = useRef(new Animated.Value(0)).current;
  const animValue2 = useRef(new Animated.Value(0)).current;
  const animValue3 = useRef(new Animated.Value(0)).current;

  const getSpeedDuration = () => {
    switch (speed) {
      case 'slow':
        return 20000;
      case 'fast':
        return 5000;
      default:
        return 10000;
    }
  };

  const getDefaultColors = (): readonly [string, string, ...string[]] => {
    const hour = new Date().getHours();

    // Time-based color schemes
    if (hour >= 5 && hour < 12) {
      // Morning - warm sunrise colors
      return [
        theme.colors.warning[200] + '40',
        theme.colors.primary[300] + '30',
        theme.colors.secondary[200] + '20',
        theme.colors.background,
      ] as const;
    } else if (hour >= 12 && hour < 17) {
      // Afternoon - bright energetic colors
      return [
        theme.colors.primary[300] + '30',
        theme.colors.info[200] + '25',
        theme.colors.success[200] + '20',
        theme.colors.background,
      ] as const;
    } else if (hour >= 17 && hour < 20) {
      // Evening - sunset colors
      return [
        theme.colors.secondary[300] + '35',
        theme.colors.error[200] + '25',
        theme.colors.warning[200] + '20',
        theme.colors.background,
      ] as const;
    } else {
      // Night - calm cool colors
      return [
        theme.colors.primary[400] + '25',
        theme.colors.secondary[400] + '20',
        theme.colors.info[400] + '15',
        theme.colors.background,
      ] as const;
    }
  };

  useEffect(() => {
    // DISABLED ANIMATIONS FOR PERFORMANCE
    // These animations were causing severe performance issues (40+ second renders)
    // If animations are needed in the future, they should:
    // 1. Use useNativeDriver: true
    // 2. Be limited to opacity/transform only
    // 3. Run on demand, not continuously
    console.log('[Performance] AnimatedGradientBackground animations disabled for performance');
    return;
  }, [animated, animValue1, animValue2, animValue3]);

  const gradientColors = colors || getDefaultColors();

  const renderGradient = () => {
    // SIMPLIFIED FOR PERFORMANCE - Just render a static gradient
    // All animated gradients have been disabled due to severe performance issues
    return (
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
    );
  };

  return (
    <View style={[styles.container, style]}>
      {renderGradient()}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  // Wave styles
  waveGradient: {
    position: 'absolute',
    width: screenWidth * 1.5,
    height: screenHeight * 1.5,
    left: -screenWidth * 0.25,
    top: -screenHeight * 0.25,
  },
  waveGradient2: {
    position: 'absolute',
    width: screenWidth * 1.5,
    height: screenHeight * 1.5,
    right: -screenWidth * 0.25,
    bottom: -screenHeight * 0.25,
  },
  // Aurora styles
  auroraGradient: {
    position: 'absolute',
    width: screenWidth * 2,
    height: screenHeight * 2,
    left: -screenWidth * 0.5,
    top: -screenHeight * 0.5,
  },
  auroraGradient2: {
    position: 'absolute',
    width: screenWidth * 2,
    height: screenHeight * 2,
    right: -screenWidth * 0.5,
    bottom: -screenHeight * 0.5,
  },
  // Mesh styles
  meshBlob1: {
    position: 'absolute',
    width: screenWidth * 0.8,
    height: screenWidth * 0.8,
    left: -screenWidth * 0.2,
    top: -screenHeight * 0.1,
  },
  meshBlob2: {
    position: 'absolute',
    width: screenWidth * 0.9,
    height: screenWidth * 0.9,
    right: -screenWidth * 0.3,
    top: screenHeight * 0.2,
  },
  meshBlob3: {
    position: 'absolute',
    width: screenWidth * 0.7,
    height: screenWidth * 0.7,
    left: screenWidth * 0.1,
    bottom: -screenHeight * 0.1,
  },
  meshGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 1000,
  },
});
