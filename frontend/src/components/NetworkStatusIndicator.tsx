import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useOffline } from '@/hooks/useOffline';
import { rs } from '@/utils/responsive';
import { testApiConnectivityAsync } from '@/config/api';
import { BlurView } from 'expo-blur';

const { width: screenWidth } = Dimensions.get('window');

export const NetworkStatusIndicator: React.FC = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { isOnline, queueSize, clearQueue } = useOffline();
  const [apiReachable, setApiReachable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [lastErrorTime, setLastErrorTime] = useState(0);

  const translateY = useRef(new Animated.Value(100)).current; // Start from bottom
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const previousOnlineStatus = useRef(isOnline);
  const previousApiStatus = useRef(apiReachable);

  // Debounce error notifications to prevent spam
  const DEBOUNCE_TIME = 30000; // 30 seconds - increased to reduce spam further

  // Check API connectivity when online status changes
  useEffect(() => {
    if (isOnline) {
      setIsChecking(true);
      testApiConnectivityAsync()
        .then((reachable) => {
          setApiReachable(reachable);
          setIsChecking(false);
          
          if (__DEV__) {
            console.log(`📡 [NETWORK] Internet: ${isOnline ? 'YES' : 'NO'}, API: ${reachable ? 'REACHABLE' : 'UNREACHABLE'}`);
          }
        })
        .catch(() => {
          setApiReachable(false);
          setIsChecking(false);
        });
    } else {
      setApiReachable(false);
    }
  }, [isOnline]);

  useEffect(() => {
    const now = Date.now();
    const wasOffline = !previousOnlineStatus.current || previousApiStatus.current === false;
    const isBackOnline = isOnline && apiReachable === true && wasOffline;
    const isError = !isOnline || (isOnline && apiReachable === false);
    
    // Show success toast when back online
    if (isBackOnline) {
      setShowToast(true);
      showToastWithAnimation();
      hideToastAfterDelay(2000); // Shorter success message
    }
    // Show error toast only if debounce time has passed
    else if (isError && (now - lastErrorTime > DEBOUNCE_TIME)) {
      setLastErrorTime(now);
      setShowToast(true);
      showToastWithAnimation();
      hideToastAfterDelay(4000); // Shorter error message
    }

    previousOnlineStatus.current = isOnline;
    previousApiStatus.current = apiReachable;
  }, [isOnline, apiReachable]);

  const showToastWithAnimation = () => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideToastAfterDelay = (delay: number) => {
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 100,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowToast(false);
      });
    }, delay);
  };

  const getStatusMessage = () => {
    if (!isOnline) {
      return 'No internet connection';
    }
    if (isOnline && apiReachable === false) {
      return 'Working offline';
    }
    if (isOnline && apiReachable === true && 
        (previousOnlineStatus.current === false || previousApiStatus.current === false)) {
      return 'Connected';
    }
    return '';
  };

  const getStatusColor = () => {
    if (!isOnline || apiReachable === false) {
      return theme.colors.warning[500]; // Changed from error to warning for less alarm
    }
    return theme.colors.success[500];
  };
  
  const getStatusIcon = () => {
    if (!isOnline) {
      return '📱';
    }
    if (isOnline && apiReachable === false) {
      return '⏱️';
    }
    if (isOnline && apiReachable === true) {
      return '✅';
    }
    return '⚠️';
  };

  // Don't render anything if not showing toast
  if (!showToast) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }, { scale }],
          opacity,
          bottom: insets.bottom + 85, // Position above bottom nav
        },
      ]}
    >
      <BlurView intensity={20} style={styles.blurContainer}>
        <View style={[styles.toastContent, { backgroundColor: getStatusColor() + '20' }]}>
          <View style={styles.messageContainer}>
            <Text style={styles.statusIcon}>{getStatusIcon()}</Text>
            <Text style={[styles.statusText, { color: theme.colors.text.primary }]}>
              {getStatusMessage()}
            </Text>
          </View>
          
          {/* Show queue info when offline or server unreachable */}
          {(!isOnline || apiReachable === false) && queueSize > 0 && (
            <Text style={[styles.queueText, { color: theme.colors.text.secondary }]}>
              {queueSize} {queueSize === 1 ? 'action' : 'actions'} queued
            </Text>
          )}
        </View>
      </BlurView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 1000,
    elevation: 1000,
  },
  blurContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  toastContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  queueText: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
});
