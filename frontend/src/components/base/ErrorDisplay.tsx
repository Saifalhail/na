import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@theme/ThemeContext';
import { Theme } from '@theme/index';
import Card from './Card';

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

  const errorMessage = error instanceof Error ? error.message : error;

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <Text style={styles.compactText}>{errorMessage}</Text>
        {onRetry && (
          <TouchableOpacity onPress={onRetry}>
            <Text style={styles.retryTextCompact}>{retryText}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <Card variant="outlined" style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>⚠️</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{errorMessage}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>{retryText}</Text>
        </TouchableOpacity>
      )}
    </Card>
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

export const FieldError: React.FC<FieldErrorProps> = ({
  error,
  touched = true,
  style,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  if (!error || !touched) return null;

  return (
    <Text style={[styles.fieldError, style]}>{error}</Text>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
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