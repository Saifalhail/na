import React from 'react';
import { borderRadius, rs } from '@/utils/responsive';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  ViewStyle,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@theme/ThemeContext';
import { Theme } from '@theme/index';

// Spinner component
interface SpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  style?: ViewStyle;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'large', color, style }) => {
  const { theme } = useTheme();

  return <ActivityIndicator size={size} color={color || theme.colors.primary[500]} style={style} />;
};

// Loading overlay component
interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  fullScreen?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message,
  fullScreen = true,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  if (!visible) return null;

  const content = (
    <View style={styles.container}>
      <View style={styles.content}>
        <Spinner size="large" />
        {message && <Text style={styles.message}>{message}</Text>}
      </View>
    </View>
  );

  if (fullScreen) {
    return (
      <Modal transparent visible={visible}>
        {content}
      </Modal>
    );
  }

  return content;
};

// Skeleton loader component
interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height: height as any,
          borderRadius,
        },
        style,
      ]}
    />
  );
};

// List skeleton component
interface ListSkeletonProps {
  count?: number;
  itemHeight?: number;
  spacing?: number;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({
  count = 5,
  itemHeight = 80,
  spacing = 12,
}) => {
  const { theme } = useTheme();

  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[
            {
              marginBottom: index < count - 1 ? spacing : 0,
            },
          ]}
        >
          <Skeleton height={itemHeight} borderRadius={theme.borderRadius.md} />
        </View>
      ))}
    </View>
  );
};

// Loading container component
interface LoadingContainerProps {
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  children: React.ReactNode;
  emptyMessage?: string;
  isEmpty?: boolean;
}

export const LoadingContainer: React.FC<LoadingContainerProps> = ({
  loading,
  error,
  onRetry,
  children,
  emptyMessage = 'No data available',
  isEmpty = false,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Spinner size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        {onRetry && (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (isEmpty) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return <>{children}</>;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.l,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      ...theme.shadows.md,
    },
    message: {
      marginTop: theme.spacing.m,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
    },
    skeleton: {
      backgroundColor: theme.colors.neutral[200],
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.l,
    },
    errorText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.error[500],
      textAlign: 'center',
      marginBottom: theme.spacing.m,
    },
    retryButton: {
      paddingHorizontal: theme.spacing.m,
      paddingVertical: theme.spacing.s,
    },
    retryText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.primary[500],
      fontWeight: '600',
    },
    emptyText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.secondary,
      textAlign: 'center',
    },
  });

// Export all components
export default {
  Spinner,
  LoadingOverlay,
  Skeleton,
  ListSkeleton,
  LoadingContainer,
};
