import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, Platform } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';
import { UnifiedCard } from './UnifiedCard';
import { UnifiedButton } from './UnifiedButton';
import { UnifiedIcon, UNIFIED_ICONS } from './UnifiedIcon';
import { UI } from '@/constants/uiConstants';
import { borderRadius, rs } from '@/utils/responsive';
import { NetworkError, ApiError, ValidationError } from '@/services/api/errors';

interface ErrorDisplayProps {
  error?: string | Error | null;
  title?: string;
  onRetry?: () => void;
  retryText?: string;
  compact?: boolean;
  style?: ViewStyle;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  title = 'Something went wrong',
  onRetry,
  retryText = 'Try Again',
  compact = false,
  style,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  if (!error) return null;

  // Get user-friendly error message and action based on error type
  const getErrorDetails = () => {
    if (error instanceof NetworkError) {
      return {
        title: 'Connection Issue',
        message: 'Unable to connect to the server. Please check your internet connection.',
        actions: [
          '• Check your Wi-Fi or mobile data',
          '• Ensure the app server is running',
          Platform.OS === 'android' ? '• Try: adb reverse tcp:8000 tcp:8000' : null,
        ].filter(Boolean),
        icon: '📡',
      };
    }

    if (error instanceof ApiError) {
      if (error.isAuthError()) {
        return {
          title: 'Authentication Required',
          message: 'Your session has expired. Please log in again.',
          icon: '🔒',
        };
      }
      if (error.isRateLimitError()) {
        return {
          title: 'Too Many Requests',
          message: 'Please wait a moment before trying again.',
          icon: '⏳',
        };
      }
      if (error.isServerError()) {
        return {
          title: 'Server Error',
          message: 'The server is experiencing issues. Please try again later.',
          icon: '🔧',
        };
      }
    }

    if (error instanceof ValidationError) {
      return {
        title: 'Invalid Input',
        message: error.getFirstError(),
        icon: '📝',
      };
    }

    // Check for common error patterns
    const errorMessage = error instanceof Error ? error.message : error;
    
    if (errorMessage.toLowerCase().includes('network')) {
      return {
        title: 'Network Problem',
        message: 'Check your internet connection and try again.',
        icon: '🌐',
      };
    }

    if (errorMessage.toLowerCase().includes('timeout')) {
      return {
        title: 'Request Timeout',
        message: 'The request took too long. Please check your connection and try again.',
        icon: '⏱️',
      };
    }

    // Default error
    return {
      title: title,
      message: errorMessage,
      icon: '⚠️',
    };
  };

  const errorDetails = getErrorDetails();

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <Text style={styles.compactText}>{errorDetails.message}</Text>
        {onRetry && (
          <UnifiedButton 
            onPress={onRetry}
            variant="ghost"
            size="small"
            style={styles.compactRetryButton}
          >
            {retryText}
          </UnifiedButton>
        )}
      </View>
    );
  }

  return (
    <UnifiedCard style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{errorDetails.icon}</Text>
      </View>
      <Text style={styles.title}>{errorDetails.title}</Text>
      <Text style={styles.message}>{errorDetails.message}</Text>
      
      {/* Show actionable steps if available */}
      {errorDetails.actions && errorDetails.actions.length > 0 && (
        <View style={styles.actionsContainer}>
          <Text style={styles.actionsTitle}>Try these steps:</Text>
          {errorDetails.actions.map((action, index) => (
            <Text key={index} style={styles.actionItem}>
              {action}
            </Text>
          ))}
        </View>
      )}
      
      {onRetry && (
        <UnifiedButton 
          onPress={onRetry}
          variant="primary"
          style={styles.retryButton}
        >
          {retryText}
        </UnifiedButton>
      )}
    </UnifiedCard>
  );
};

// Error message component for inline errors
interface ErrorMessageProps {
  message?: string | null;
  style?: ViewStyle;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, style }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  if (!message) return null;

  return (
    <View style={[styles.errorMessageContainer, style]}>
      <Text style={styles.errorMessageText}>{message}</Text>
    </View>
  );
};

// Field error component for form validation
interface FieldErrorProps {
  error?: string | null;
  touched?: boolean;
  style?: ViewStyle;
}

export const FieldError: React.FC<FieldErrorProps> = ({ error, touched = true, style }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  if (!error || !touched) return null;

  return <Text style={[styles.fieldError, style]}>{error}</Text>;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      padding: theme.spacing.l,
      alignItems: 'center',
      borderColor: theme.colors.error[500],
    },
    compactContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.s,
      backgroundColor: theme.colors.error[50],
      borderRadius: theme.borderRadius.sm,
    },
    iconContainer: {
      marginBottom: theme.spacing.s,
    },
    icon: {
      fontSize: 32,
    },
    title: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xs,
      textAlign: 'center',
    },
    message: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      marginBottom: theme.spacing.m,
    },
    actionsContainer: {
      backgroundColor: theme.colors.neutral[50],
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.m,
      marginBottom: theme.spacing.m,
      width: '100%',
    },
    actionsTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xs,
    },
    actionItem: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      lineHeight: 20,
      marginVertical: 2,
    },
    retryButton: {
      paddingHorizontal: theme.spacing.l,
      paddingVertical: theme.spacing.s,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.error[500],
    },
    retryText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.error[500],
      fontWeight: '600',
    },
    compactText: {
      flex: 1,
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.error[500],
    },
    retryTextCompact: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.error[500],
      fontWeight: '600',
      marginLeft: theme.spacing.s,
    },
    errorMessageContainer: {
      backgroundColor: theme.colors.error[50],
      padding: theme.spacing.s,
      borderRadius: theme.borderRadius.sm,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.error[500],
    },
    errorMessageText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.error[500],
    },
    fieldError: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.error[500],
      marginTop: theme.spacing.xs,
    },
  });

export default ErrorDisplay;
