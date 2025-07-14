import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';
import { spacing } from '@/theme/spacing';

interface HeaderLogoProps {
  size?: number;
  style?: any;
}

export const HeaderLogo: React.FC<HeaderLogoProps> = ({ size = 48, style }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {/* Add a subtle glow effect in dark mode */}
      {theme.isDark && (
        <View style={[styles.glowEffect, { width: size * 1.2, height: size * 1.2 }]} />
      )}
      <Image
        source={require('../../../assets/logo_cropped.png')}
        style={[styles.logo, { width: size, height: size }]}
        resizeMode="contain"
      />
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      position: 'relative',
      justifyContent: 'center',
      alignItems: 'center',
    },
    logo: {
      // Add tint color for dark mode if the logo doesn't have transparency
      tintColor: theme.isDark ? theme.colors.primary[400] : undefined,
    },
    glowEffect: {
      position: 'absolute',
      backgroundColor: theme.colors.primary[500],
      opacity: 0.2,
      borderRadius: spacing['12'], // 48px
      // Add blur effect for glow
      transform: [{ scale: 1.2 }],
    },
  });

export default HeaderLogo;