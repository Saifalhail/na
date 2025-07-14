import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Button } from './Button';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';
import { spacing, layout } from '@/theme/spacing';
import { textPresets } from '@/theme/typography';

interface EmptyStateProps {
  icon?: React.ReactNode;
  image?: any; // Image source
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: any;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  image,
  title,
  subtitle,
  actionLabel,
  onAction,
  style,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={[styles.container, style]}>
      {image && (
        <Image
          source={image}
          style={styles.image}
          resizeMode="contain"
        />
      )}
      
      {icon && !image && (
        <View style={styles.iconContainer}>
          {icon}
        </View>
      )}

      <Text style={styles.title}>{title}</Text>
      
      {subtitle && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}

      {actionLabel && onAction && (
        <Button
          onPress={onAction}
          variant="primary"
          size="medium"
          style={styles.button}
        >
          {actionLabel}
        </Button>
      )}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing['8'], // 32px
      paddingVertical: spacing['12'], // 48px
    },
    image: {
      width: spacing['32'], // 128px
      height: spacing['32'], // 128px
      marginBottom: spacing['6'], // 24px
      opacity: 0.8,
    },
    iconContainer: {
      marginBottom: spacing['6'], // 24px
    },
    title: {
      ...textPresets.h3,
      color: theme.colors.text.primary,
      fontWeight: theme.typography.fontWeight.semibold,
      textAlign: 'center',
      marginBottom: spacing['3'], // 12px
    },
    subtitle: {
      ...textPresets.body,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      lineHeight: spacing['6'], // 24px
      marginBottom: spacing['6'], // 24px
      maxWidth: '80%',
    },
    button: {
      minWidth: spacing['32'], // 128px
    },
  });

export default EmptyState;