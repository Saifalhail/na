import React, { useEffect, useRef } from 'react';
import { View, Animated, ViewStyle, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/theme/spacing';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
  variant?: 'text' | 'rectangular' | 'circular';
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = React.memo(({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
  variant = 'rectangular',
}) => {
  const { theme } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const getVariantStyles = () => {
    switch (variant) {
      case 'circular':
        return {
          width: height,
          height,
          borderRadius: height / 2,
        };
      case 'text':
        return {
          width,
          height: 16,
          borderRadius: 4,
        };
      default:
        return {
          width,
          height,
          borderRadius,
        };
    }
  };

  return (
    <Animated.View
      style={[
        getVariantStyles(),
        {
          backgroundColor: theme.colors.neutral[200],
          opacity,
        },
        style,
      ]}
    />
  );
});

// Pre-built skeleton components for common layouts
export const SkeletonCard: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }, style]}>
      <View style={styles.cardHeader}>
        <SkeletonLoader variant="circular" height={40} />
        <View style={styles.cardHeaderText}>
          <SkeletonLoader width="60%" height={16} style={styles.mb1} />
          <SkeletonLoader width="40%" height={12} />
        </View>
      </View>
      <SkeletonLoader height={100} style={styles.mb2} />
      <SkeletonLoader width="80%" height={14} style={styles.mb1} />
      <SkeletonLoader width="60%" height={14} />
    </View>
  );
};

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} style={index > 0 ? styles.mt2 : undefined} />
      ))}
    </>
  );
};

export const SkeletonProgressCard: React.FC = () => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <SkeletonLoader width="50%" height={20} style={styles.mb3} />
      <View style={styles.center}>
        <SkeletonLoader variant="circular" height={120} style={styles.mb3} />
      </View>
      <View style={styles.row}>
        <View style={styles.flex1}>
          <SkeletonLoader width="60%" height={16} style={styles.mb1} />
          <SkeletonLoader width="40%" height={12} />
        </View>
        <View style={styles.flex1}>
          <SkeletonLoader width="60%" height={16} style={styles.mb1} />
          <SkeletonLoader width="40%" height={12} />
        </View>
        <View style={styles.flex1}>
          <SkeletonLoader width="60%" height={16} style={styles.mb1} />
          <SkeletonLoader width="40%" height={12} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing['4'],
    borderRadius: spacing['2'],
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing['3'],
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: spacing['3'],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  center: {
    alignItems: 'center',
  },
  flex1: {
    flex: 1,
    alignItems: 'center',
  },
  mb1: {
    marginBottom: spacing['1'],
  },
  mb2: {
    marginBottom: spacing['2'],
  },
  mb3: {
    marginBottom: spacing['3'],
  },
  mt2: {
    marginTop: spacing['2'],
  },
});