import React, { useEffect, useRef } from 'react';
import { rs } from '@/utils/responsive';
import { View, Text, StyleSheet, Animated, ViewStyle, TextStyle, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';

interface StreakCounterProps {
  count: number;
  label?: string;
  size?: 'small' | 'medium' | 'large';
  showFlame?: boolean;
  animated?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  milestone?: number;
}

export const StreakCounter: React.FC<StreakCounterProps> = ({
  count,
  label = 'day streak',
  size = 'medium',
  showFlame = true,
  animated = true,
  style,
  textStyle,
  milestone = 7,
}) => {
  const { theme } = useTheme();
  const scaleAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const rotateAnimation = useRef(new Animated.Value(0)).current;

  const isMilestone = count > 0 && count % milestone === 0;

  useEffect(() => {
    if (animated && count > 0) {
      // Initial entrance animation
      Animated.spring(scaleAnimation, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      // Pulse animation for milestones
      if (isMilestone) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnimation, {
              toValue: 1.1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnimation, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }

      // Flame wiggle animation
      if (showFlame) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(rotateAnimation, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(rotateAnimation, {
              toValue: -1,
              duration: 2000,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    } else {
      scaleAnimation.setValue(1);
    }
  }, [count, animated, isMilestone, showFlame]);

  const containerStyle = getContainerStyle(size);
  const textStyles = getTextStyle(size, theme);
  const flameSize = getFlameSize(size);

  const rotate = rotateAnimation.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-5deg', '5deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        containerStyle,
        style,
        {
          transform: [
            { scale: animated ? scaleAnimation : 1 },
            { scale: isMilestone ? pulseAnimation : 1 },
          ],
        },
      ]}
    >
      {count > 0 ? (
        <LinearGradient
          colors={
            isMilestone
              ? [theme.colors.primary[500], theme.colors.primary[700]]
              : [theme.colors.primary[400], theme.colors.primary[600]]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, containerStyle]}
        >
          {showFlame && (
            <Animated.Text style={[styles.flame, { fontSize: flameSize, transform: [{ rotate }] }]}>
              ⚡
            </Animated.Text>
          )}
          <View style={styles.content}>
            <Text style={[styles.count, textStyles.count, textStyle]}>{count}</Text>
            <Text style={[styles.label, textStyles.label, textStyle]}>{label}</Text>
          </View>
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.emptyContainer,
            containerStyle,
            { backgroundColor: theme.colors.neutral[200] },
          ]}
        >
          <Text style={[styles.emptyText, { color: theme.colors.neutral[500] }]}>
            Start your streak! 🎯
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const getContainerStyle = (size: 'small' | 'medium' | 'large'): ViewStyle => {
  const sizes = {
    small: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      minWidth: 80,
    },
    medium: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 20,
      minWidth: 100,
    },
    large: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderRadius: 24,
      minWidth: 120,
    },
  };

  return sizes[size];
};

const getTextStyle = (size: 'small' | 'medium' | 'large', theme: any) => {
  const sizes = {
    small: {
      count: {
        fontSize: 20,
        lineHeight: 24,
      },
      label: {
        fontSize: 10,
        lineHeight: 12,
      },
    },
    medium: {
      count: {
        fontSize: 28,
        lineHeight: 32,
      },
      label: {
        fontSize: 12,
        lineHeight: 16,
      },
    },
    large: {
      count: {
        fontSize: 36,
        lineHeight: 40,
      },
      label: {
        fontSize: 14,
        lineHeight: 18,
      },
    },
  };

  return sizes[size];
};

const getFlameSize = (size: 'small' | 'medium' | 'large'): number => {
  const sizes = {
    small: 16,
    medium: 20,
    large: 24,
  };
  return sizes[size];
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  count: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  label: {
    color: '#FFFFFF',
    fontWeight: '500',
    opacity: 0.9,
    marginTop: -2,
  },
  flame: {
    marginRight: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
