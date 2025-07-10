import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useOffline } from '@/hooks/useOffline';

export const NetworkStatusIndicator: React.FC = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { isOnline, queueSize, clearQueue } = useOffline();

  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const previousOnlineStatus = useRef(isOnline);

  useEffect(() => {
    if (!isOnline) {
      // Show offline indicator
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
    } else if (previousOnlineStatus.current === false && isOnline) {
      // Show "back online" message briefly
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }, 2000);
    }

    previousOnlineStatus.current = isOnline;
  }, [isOnline]);

  const getStatusMessage = () => {
    if (!isOnline) {
      return 'No Internet Connection';
    }
    if (previousOnlineStatus.current === false && isOnline) {
      return 'Back Online';
    }
    return '';
  };

  const getStatusColor = () => {
    if (!isOnline) {
      return theme.colors.error[500];
    }
    return theme.colors.success[500];
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: getStatusColor(),
          transform: [{ translateY }],
          opacity,
          paddingTop: insets.top,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.messageContainer}>
          <Text style={styles.statusIcon}>{isOnline ? '✓' : '⚠️'}</Text>
          <Text style={styles.statusText}>{getStatusMessage()}</Text>
        </View>

        {!isOnline && queueSize > 0 && (
          <View style={styles.queueInfo}>
            <Text style={styles.queueText}>
              {queueSize} {queueSize === 1 ? 'action' : 'actions'} pending
            </Text>
            <TouchableOpacity onPress={clearQueue} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {!isOnline && (
        <View style={styles.progressBar}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: '100%',
                backgroundColor: 'rgba(255,255,255,0.3)',
              },
            ]}
          />
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIcon: {
    color: '#fff',
    fontSize: 16,
    marginRight: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  queueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  queueText: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
  },
  clearButton: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  progressBar: {
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  progressFill: {
    height: '100%',
  },
});
