import { Alert, Platform } from 'react-native';
import { NetworkError, ApiError, ValidationError, AuthenticationError } from '@/services/api/errors';
import { toastManager } from '@/components/base/Toast';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  showAlert?: boolean;
  fallbackMessage?: string;
  onAuthError?: () => void;
  context?: string;
}

/**
 * Handles errors consistently across the app with user-friendly messages
 */
export const handleError = (
  error: any,
  options: ErrorHandlerOptions = {}
): string => {
  const {
    showToast = true,
    showAlert = false,
    fallbackMessage = 'Something went wrong. Please try again.',
    onAuthError,
    context,
  } = options;

  let title: string;
  let message: string;
  let actions: string[] = [];

  // Log error in development
  if (__DEV__) {
    console.error(`[ERROR]${context ? ` in ${context}` : ''}:`, error);
  }

  // Handle specific error types
  if (error instanceof NetworkError) {
    title = 'Connection Issue';
    message = 'Unable to connect to the server. Please check your internet connection.';
    actions = [
      'Check your Wi-Fi or mobile data',
      'Ensure the app server is running',
      Platform.OS === 'android' ? 'Try: adb reverse tcp:8000 tcp:8000' : '',
    ].filter(Boolean);
  } else if (error instanceof AuthenticationError) {
    title = 'Authentication Required';
    message = 'Your session has expired. Please log in again.';
    // Call auth error callback if provided
    if (onAuthError) {
      onAuthError();
    }
  } else if (error instanceof ApiError) {
    if (error.isRateLimitError()) {
      title = 'Too Many Requests';
      message = 'Please wait a moment before trying again.';
    } else if (error.isServerError()) {
      title = 'Server Error';
      message = 'The server is experiencing issues. Please try again later.';
    } else if (error.isValidationError()) {
      title = 'Invalid Input';
      message = error.message || 'Please check your input and try again.';
    } else {
      title = 'Request Failed';
      message = error.message || fallbackMessage;
    }
  } else if (error instanceof ValidationError) {
    title = 'Validation Error';
    message = error.getFirstError();
  } else if (error?.message) {
    // Check for common error patterns
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('network request failed')) {
      title = 'Network Error';
      message = 'Unable to connect. Please check your internet connection.';
      actions = ['Check if the backend server is running'];
    } else if (errorMessage.includes('timeout')) {
      title = 'Request Timeout';
      message = 'The request took too long. Please try again.';
    } else if (errorMessage.includes('canceled')) {
      // Don't show anything for canceled requests
      return '';
    } else {
      title = 'Error';
      message = error.message;
    }
  } else {
    title = 'Error';
    message = fallbackMessage;
  }

  // Show error notification
  if (showToast && message) {
    toastManager.show({
      type: 'error',
      title: title,
      message: message,
      duration: 4000,
    });
  }

  if (showAlert && message) {
    const alertMessage = actions.length > 0
      ? `${message}\n\nTry these steps:\n${actions.join('\n')}`
      : message;

    Alert.alert(title, alertMessage, [{ text: 'OK' }]);
  }

  return message;
};

/**
 * Extracts a user-friendly error message from any error
 */
export const getErrorMessage = (error: any): string => {
  if (error instanceof NetworkError) {
    return 'Network connection failed. Please check your internet.';
  }
  
  if (error instanceof ApiError) {
    return error.message;
  }
  
  if (error instanceof ValidationError) {
    return error.getFirstError();
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
};

/**
 * Checks if an error is related to network connectivity
 */
export const isNetworkError = (error: any): boolean => {
  return (
    error instanceof NetworkError ||
    error?.message?.toLowerCase().includes('network') ||
    error?.message?.toLowerCase().includes('fetch') ||
    error?.code === 'NETWORK_ERROR'
  );
};

/**
 * Checks if an error is an authentication error
 */
export const isAuthError = (error: any): boolean => {
  return (
    error instanceof AuthenticationError ||
    (error instanceof ApiError && error.isAuthError()) ||
    error?.statusCode === 401 ||
    error?.code === 'AUTHENTICATION_ERROR'
  );
};

/**
 * Creates a retry function with exponential backoff
 */
export const createRetryHandler = (
  fn: () => Promise<any>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    onRetry?: (attempt: number) => void;
  } = {}
) => {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 8000,
    onRetry,
  } = options;

  return async () => {
    let lastError: any;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Don't retry auth errors or validation errors
        if (isAuthError(error) || error instanceof ValidationError) {
          throw error;
        }
        
        if (attempt < maxRetries - 1) {
          const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
          
          if (onRetry) {
            onRetry(attempt + 1);
          }
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  };
};