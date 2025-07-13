import React, { useEffect, useRef } from 'react';
import { rs } from '@/utils/responsive';
import { 
  StyleSheet, 
  Animated, 
  ViewStyle,
  Dimensions,
  View
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export type GradientType = 'mesh' | 'radial' | 'diagonal' | 'wave' | 'aurora' | 'dynamic';

interface AnimatedGradientBackgroundProps {
  type?: GradientType;
  colors?: string[];
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
  
  const getDefaultColors = (): string[] => {
    const hour = new Date().getHours();
    
    // Time-based color schemes
    if (hour >= 5 && hour < 12) {
      // Morning - warm sunrise colors
      return [
        theme.colors.warning[200] + '40',
        theme.colors.primary[300] + '30',
        theme.colors.secondary[200] + '20',
        theme.colors.background,
      ];
    } else if (hour >= 12 && hour < 17) {
      // Afternoon - bright energetic colors
      return [
        theme.colors.primary[300] + '30',
        theme.colors.info[200] + '25',
        theme.colors.success[200] + '20',
        theme.colors.background,
      ];
    } else if (hour >= 17 && hour < 20) {
      // Evening - sunset colors
      return [
        theme.colors.secondary[300] + '35',
        theme.colors.error[200] + '25',
        theme.colors.warning[200] + '20',
        theme.colors.background,
      ];
    } else {
      // Night - calm cool colors
      return [
        theme.colors.primary[400] + '25',
        theme.colors.secondary[400] + '20',
        theme.colors.info[400] + '15',
        theme.colors.background,
      ];
    }
  };
  
  useEffect(() => {
    if (!animated) return;
    
    const duration = getSpeedDuration();
    
    const animation1 = Animated.loop(
      Animated.sequence([
        Animated.timing(animValue1, {
          toValue: 1,
          duration: duration,
          useNativeDriver: false,
        }),
        Animated.timing(animValue1, {
          toValue: 0,
          duration: duration,
          useNativeDriver: false,
        }),
      ])
    );
    
    const animation2 = Animated.loop(
      Animated.sequence([
        Animated.timing(animValue2, {
          toValue: 1,
          duration: duration * 1.5,
          useNativeDriver: false,
        }),
        Animated.timing(animValue2, {
          toValue: 0,
          duration: duration * 1.5,
          useNativeDriver: false,
        }),
      ])
    );
    
    const animation3 = Animated.loop(
      Animated.sequence([
        Animated.timing(animValue3, {
          toValue: 1,
          duration: duration * 2,
          useNativeDriver: false,
        }),
        Animated.timing(animValue3, {
          toValue: 0,
          duration: duration * 2,
          useNativeDriver: false,
        }),
      ])
    );
    
    animation1.start();
    animation2.start();
    animation3.start();
    
    return () => {
      animation1.stop();
      animation2.stop();
      animation3.stop();
    };
  }, [animated, animValue1, animValue2, animValue3]);
  
  const gradientColors = colors || getDefaultColors();
  
  const renderGradient = () => {
    switch (type) {
      case 'wave':
        return (
          <>
            <Animated.View
              style={[
                styles.waveGradient,
                {
                  transform: [
                    {
                      translateY: animValue1.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -screenHeight * 0.3],
                      }),
                    },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
            </Animated.View>
            
            <Animated.View
              style={[
                styles.waveGradient2,
                {
                  transform: [
                    {
                      translateY: animValue2.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -screenHeight * 0.4],
                      }),
                    },
                  ],
                  opacity: 0.6,
                },
              ]}
            >
              <LinearGradient
                colors={[...gradientColors].reverse()}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
            </Animated.View>
          </>
        );
        
      case 'aurora':
        return (
          <>
            <Animated.View
              style={[
                styles.auroraGradient,
                {
                  transform: [
                    {
                      rotate: animValue1.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
            </Animated.View>
            
            <Animated.View
              style={[
                styles.auroraGradient2,
                {
                  transform: [
                    {
                      rotate: animValue2.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '-360deg'],
                      }),
                    },
                  ],
                  opacity: 0.5,
                },
              ]}
            >
              <LinearGradient
                colors={[...gradientColors].reverse()}
                start={{ x: 0.5, y: 0.5 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
            </Animated.View>
          </>
        );
        
      case 'mesh':
        return (
          <>
            <Animated.View
              style={[
                styles.meshBlob1,
                {
                  transform: [
                    {
                      translateX: animValue1.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, screenWidth * 0.3],
                      }),
                    },
                    {
                      translateY: animValue2.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, screenHeight * 0.2],
                      }),
                    },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={[gradientColors[0], gradientColors[1]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.meshGradient}
              />
            </Animated.View>
            
            <Animated.View
              style={[
                styles.meshBlob2,
                {
                  transform: [
                    {
                      translateX: animValue2.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -screenWidth * 0.3],
                      }),
                    },
                    {
                      translateY: animValue3.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -screenHeight * 0.2],
                      }),
                    },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={[gradientColors[1], gradientColors[2]]}
                start={{ x: 0.5, y: 0.5 }}
                end={{ x: 1, y: 0 }}
                style={styles.meshGradient}
              />
            </Animated.View>
            
            <Animated.View
              style={[
                styles.meshBlob3,
                {
                  transform: [
                    {
                      translateX: animValue3.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, screenWidth * 0.2],
                      }),
                    },
                    {
                      translateY: animValue1.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, screenHeight * 0.15],
                      }),
                    },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={[gradientColors[2], gradientColors[0]]}
                start={{ x: 1, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.meshGradient}
              />
            </Animated.View>
          </>
        );
        
      default:
        return (
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        );
    }
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