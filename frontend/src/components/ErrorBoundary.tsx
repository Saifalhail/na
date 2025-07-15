import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightColors, darkColors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// Wrapper component to provide theme context
export const ErrorBoundary: React.FC<Props> = (props) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? darkColors : lightColors;
  
  return <ErrorBoundaryClass {...props} colors={colors} isDark={isDark} />;
};

interface ErrorBoundaryClassProps extends Props {
  colors: typeof lightColors;
  isDark: boolean;
}

class ErrorBoundaryClass extends Component<ErrorBoundaryClassProps, State> {
  constructor(props: ErrorBoundaryClassProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      errorInfo,
    });

    // Call the optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to crash reporting service if enabled
    if (__DEV__) {
      console.error('Component Stack:', errorInfo.componentStack);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    const { colors, isDark } = this.props;
    const styles = createStyles(colors, isDark);

    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      // Default error UI
      return (
        <SafeAreaView style={styles.container}>
          <StatusBar 
            barStyle={isDark ? 'light-content' : 'dark-content'} 
            backgroundColor={colors.background}
          />
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.errorContainer}>
              <Text style={styles.icon}>🚨</Text>
              <Text style={styles.title}>Oops! Something went wrong</Text>
              <Text style={styles.message}>
                We apologize for the inconvenience. An unexpected error occurred.
              </Text>

              {__DEV__ && this.state.error && (
                <View style={styles.errorDetails}>
                  <Text style={styles.errorTitle}>Error Details:</Text>
                  <Text style={styles.errorText}>{this.state.error.toString()}</Text>

                  {this.state.errorInfo && (
                    <ScrollView style={styles.stackTrace}>
                      <Text style={styles.stackText}>{this.state.errorInfo.componentStack}</Text>
                    </ScrollView>
                  )}
                </View>
              )}

              <TouchableOpacity style={styles.button} onPress={this.handleReset}>
                <Text style={styles.buttonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const createStyles = (colors: typeof lightColors, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: spacing['5'],
    },
    errorContainer: {
      backgroundColor: colors.surface,
      borderRadius: spacing['4'],
      padding: spacing['6'],
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: colors.error[200],
    },
    icon: {
      fontSize: 48,
      textAlign: 'center',
      marginBottom: spacing['4'],
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.text.primary,
      marginBottom: spacing['3'],
      textAlign: 'center',
    },
    message: {
      fontSize: 16,
      color: colors.text.secondary,
      textAlign: 'center',
      marginBottom: spacing['6'],
      lineHeight: 22,
    },
    button: {
      backgroundColor: colors.error[500],
      paddingVertical: spacing['3'],
      paddingHorizontal: spacing['6'],
      borderRadius: spacing['2'],
      alignSelf: 'center',
    },
    buttonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '600',
    },
    errorDetails: {
      marginTop: spacing['5'],
      marginBottom: spacing['5'],
      padding: spacing['4'],
      backgroundColor: isDark ? colors.error[900] : colors.error[50],
      borderRadius: spacing['2'],
      borderWidth: 1,
      borderColor: isDark ? colors.error[700] : colors.error[200],
    },
    errorTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: isDark ? colors.error[300] : colors.error[700],
      marginBottom: spacing['2'],
    },
    errorText: {
      fontSize: 12,
      color: isDark ? colors.error[300] : colors.error[700],
      fontFamily: 'monospace',
    },
    stackTrace: {
      marginTop: spacing['3'],
      maxHeight: 200,
    },
    stackText: {
      fontSize: 10,
      color: isDark ? colors.error[400] : colors.error[600],
      fontFamily: 'monospace',
    },
  });

export default ErrorBoundary;