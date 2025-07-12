import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  Platform,
  Dimensions,
  AccessibilityInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'default';
export type ToastPosition = 'top' | 'bottom';

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  duration?: number;
  position?: ToastPosition;
  onDismiss?: () => void;
  action?: {
    label: string;
    onPress: () => void;
  };
  icon?: React.ReactNode;
  testID?: string;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  variant = 'default',
  duration = 3000,
  position = 'bottom',
  onDismiss,
  action,
  icon,
  testID,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(position === 'top' ? -100 : 100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Announce to screen readers
    AccessibilityInfo.announceForAccessibility(message);

    // Animate in
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss
    if (duration > 0) {
      const timer = setTimeout(() => {
        dismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
    
    return undefined;
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: position === 'top' ? -100 : 100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      onDismiss?.();
    });
  };

  if (!visible) return null;

  const getIcon = () => {
    if (icon) return icon;

    const iconProps = {
      size: 20,
      color: theme.colors.white,
    };

    switch (variant) {
      case 'success':
        return <Ionicons name="checkmark-circle" {...iconProps} />;
      case 'error':
        return <Ionicons name="close-circle" {...iconProps} />;
      case 'warning':
        return <Ionicons name="warning" {...iconProps} />;
      case 'info':
        return <Ionicons name="information-circle" {...iconProps} />;
      default:
        return null;
    }
  };

  const toastStyle: ViewStyle[] = [
    styles.container,
    styles[variant],
    position === 'top' 
      ? { top: insets.top + theme.spacing.m }
      : { bottom: insets.bottom + theme.spacing.m },
  ];

  return (
    <Animated.View
      style={[
        toastStyle,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
      testID={testID || `toast-${variant}`}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      {getIcon()}
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
      {action && (
        <TouchableOpacity
          onPress={() => {
            action.onPress();
            dismiss();
          }}
          style={styles.actionButton}
          accessibilityLabel={action.label}
          accessibilityRole="button"
        >
          <Text style={styles.actionText}>{action.label}</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        onPress={dismiss}
        style={styles.closeButton}
        accessibilityLabel="Dismiss"
        accessibilityRole="button"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={20} color={theme.colors.white} />
      </TouchableOpacity>
    </Animated.View>
  );
};

// Toast Manager for global toast management
class ToastManager {
  private static instance: ToastManager;
  private toastRef: React.RefObject<ToastRef | null> | null = null;

  static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager();
    }
    return ToastManager.instance;
  }

  setRef(ref: React.RefObject<ToastRef | null>) {
    this.toastRef = ref;
  }

  show(props: ToastProps) {
    this.toastRef?.current?.show(props);
  }

  success(message: string, options?: Partial<ToastProps>) {
    this.show({ ...options, message, variant: 'success' });
  }

  error(message: string, options?: Partial<ToastProps>) {
    this.show({ ...options, message, variant: 'error' });
  }

  warning(message: string, options?: Partial<ToastProps>) {
    this.show({ ...options, message, variant: 'warning' });
  }

  info(message: string, options?: Partial<ToastProps>) {
    this.show({ ...options, message, variant: 'info' });
  }
}

export const toastManager = ToastManager.getInstance();

// Toast Provider Component
interface ToastRef {
  show: (props: ToastProps) => void;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Array<ToastProps & { id: string }>>([]);
  const toastRef = useRef<ToastRef>(null);

  useEffect(() => {
    toastRef.current = {
      show: (props: ToastProps) => {
        const id = Date.now().toString();
        setToasts((prev) => [...prev, { ...props, id }]);
      },
    };
    toastManager.setRef(toastRef);
  }, []);

  const handleDismiss = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <>
      {children}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onDismiss={() => {
            handleDismiss(toast.id);
            toast.onDismiss?.();
          }}
        />
      ))}
    </>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      left: theme.spacing.m,
      right: theme.spacing.m,
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.m,
      borderRadius: theme.borderRadius.md,
      maxWidth: Dimensions.get('window').width - theme.spacing.m * 2,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.black,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: {
          elevation: 8,
        },
      }),
    },

    // Variants
    default: {
      backgroundColor: theme.colors.neutral[800],
    },
    success: {
      backgroundColor: theme.colors.success[600],
    },
    error: {
      backgroundColor: theme.colors.error[600],
    },
    warning: {
      backgroundColor: theme.colors.warning[600],
    },
    info: {
      backgroundColor: theme.colors.info[600],
    },

    // Content
    message: {
      flex: 1,
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.fontSize.sm * 1.4,
      fontFamily: theme.typography.fontFamily.regular,
      marginLeft: theme.spacing.s,
      marginRight: theme.spacing.s,
    },

    // Actions
    actionButton: {
      marginLeft: theme.spacing.s,
      paddingHorizontal: theme.spacing.s,
      paddingVertical: theme.spacing.xs,
    },
    actionText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.medium,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    closeButton: {
      marginLeft: theme.spacing.xs,
    },
  });

export default Toast;