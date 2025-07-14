import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';
import { spacing, layout } from '@/theme/spacing';
import { getModernShadow } from '@/theme/shadows';
import Animated, { FadeIn } from 'react-native-reanimated';

interface GlassHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  gradient?: boolean;
  animated?: boolean;
  absolutePosition?: boolean;
  safeArea?: boolean;
}

export const GlassHeader: React.FC<GlassHeaderProps> = ({
  children,
  style,
  intensity = 100,
  gradient = true,
  animated = true,
  absolutePosition = false,
  safeArea = true,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, insets);

  const gradientColors = theme.isDark
    ? ['rgba(18,18,18,0.9)', 'rgba(18,18,18,0.7)'] as const
    : ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)'] as const;

  const content = (
    <View 
      style={[
        styles.container, 
        absolutePosition && styles.absolute,
        safeArea && { paddingTop: insets.top },
        style
      ]}
    >
      {Platform.OS === 'ios' && (
        <BlurView
          intensity={intensity}
          tint={theme.isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      {gradient && (
        <LinearGradient
          colors={gradientColors}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      )}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );

  if (animated) {
    return (
      <Animated.View entering={FadeIn.duration(400).springify()}>
        {content}
      </Animated.View>
    );
  }

  return content;
};

const createStyles = (theme: Theme, insets: any) =>
  StyleSheet.create({
    container: {
      borderBottomWidth: layout.borderWidth.thin,
      borderBottomColor: theme.isDark
        ? 'rgba(255,255,255,0.1)'
        : 'rgba(0,0,0,0.05)',
      backgroundColor: Platform.OS === 'ios'
        ? 'transparent'
        : theme.isDark
          ? 'rgba(18,18,18,0.95)'
          : 'rgba(255,255,255,0.95)',
      ...getModernShadow('header'),
    },
    absolute: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
    },
    content: {
      paddingHorizontal: layout.screenPadding,
      paddingVertical: spacing['4'], // 16px
    },
  });

export default GlassHeader;