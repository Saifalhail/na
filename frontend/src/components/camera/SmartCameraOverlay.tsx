import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';
import { ProgressRing } from '@/components/base/ProgressRing';
import { Badge } from '@/components/base/Badge';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface SmartCameraOverlayProps {
  brightness?: number; // 0-1 (camera exposure value)
  distance?: 'too_close' | 'too_far' | 'optimal';
  angle?: number; // Device tilt angle in degrees
  isCapturing?: boolean;
  showGuidance?: boolean;
  onOptimalPosition?: () => void;
  style?: any;
}

interface GuidanceMetric {
  label: string;
  value: number;
  optimal: boolean;
  message?: string;
}

export const SmartCameraOverlay: React.FC<SmartCameraOverlayProps> = ({
  brightness = 0.5,
  distance = 'optimal',
  angle = 0,
  isCapturing = false,
  showGuidance = true,
  onOptimalPosition,
  style,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  
  // Animation values
  const frameCornerAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const checkmarkAnim = useRef(new Animated.Value(0)).current;
  
  const [captureReadiness, setCaptureReadiness] = useState(0);
  const [hasTriggeredOptimal, setHasTriggeredOptimal] = useState(false);

  // Calculate guidance metrics
  const metrics: GuidanceMetric[] = [
    {
      label: 'Lighting',
      value: brightness * 100,
      optimal: brightness >= 0.3 && brightness <= 0.8,
      message: brightness < 0.3 ? 'Too dark' : brightness > 0.8 ? 'Too bright' : 'Good',
    },
    {
      label: 'Distance',
      value: distance === 'optimal' ? 100 : distance === 'too_close' ? 30 : 50,
      optimal: distance === 'optimal',
      message: distance === 'too_close' ? 'Move back' : distance === 'too_far' ? 'Move closer' : 'Perfect',
    },
    {
      label: 'Angle',
      value: Math.max(0, 100 - Math.abs(angle - 45) * 2),
      optimal: Math.abs(angle - 45) < 15,
      message: angle < 30 ? 'Tilt down' : angle > 60 ? 'Less tilt' : 'Good angle',
    },
  ];

  // Calculate overall readiness
  useEffect(() => {
    const optimalCount = metrics.filter(m => m.optimal).length;
    const readiness = (optimalCount / metrics.length) * 100;
    setCaptureReadiness(readiness);

    // Trigger haptic and callback when optimal
    if (readiness === 100 && !hasTriggeredOptimal) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onOptimalPosition?.();
      setHasTriggeredOptimal(true);
      
      // Animate checkmark
      Animated.spring(checkmarkAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else if (readiness < 100) {
      setHasTriggeredOptimal(false);
      checkmarkAnim.setValue(0);
    }
  }, [brightness, distance, angle]);

  // Animate frame corners
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(frameCornerAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(frameCornerAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Pulse animation for optimal state
  useEffect(() => {
    if (captureReadiness === 100) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [captureReadiness]);

  if (!showGuidance) return null;

  const frameColor = captureReadiness === 100 
    ? theme.colors.success[500]
    : captureReadiness > 66 
    ? theme.colors.warning[500]
    : theme.colors.neutral[300];

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      {/* Animated Frame */}
      <Animated.View
        style={[
          styles.frameContainer,
          {
            opacity: frameCornerAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.6, 1],
            }),
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <View style={[styles.frame, { borderColor: frameColor }]}>
          {/* Corner indicators */}
          <View style={[styles.corner, styles.cornerTopLeft, { borderColor: frameColor }]} />
          <View style={[styles.corner, styles.cornerTopRight, { borderColor: frameColor }]} />
          <View style={[styles.corner, styles.cornerBottomLeft, { borderColor: frameColor }]} />
          <View style={[styles.corner, styles.cornerBottomRight, { borderColor: frameColor }]} />
          
          {/* Center crosshair */}
          <View style={styles.crosshair}>
            <View style={[styles.crosshairLine, styles.crosshairHorizontal, { backgroundColor: frameColor }]} />
            <View style={[styles.crosshairLine, styles.crosshairVertical, { backgroundColor: frameColor }]} />
          </View>
        </View>
      </Animated.View>

      {/* Readiness Indicator */}
      <View style={styles.readinessContainer}>
        <ProgressRing
          progress={captureReadiness}
          size={80}
          strokeWidth={6}
          color={frameColor}
          showLabel={false}
          animated
        >
          {captureReadiness === 100 ? (
            <Animated.View
              style={{
                transform: [{ scale: checkmarkAnim }],
              }}
            >
              <Text style={styles.checkmark}>✓</Text>
            </Animated.View>
          ) : (
            <Text style={styles.readinessText}>{Math.round(captureReadiness)}%</Text>
          )}
        </ProgressRing>
        <Text style={styles.readinessLabel}>Capture Ready</Text>
      </View>

      {/* Guidance Metrics */}
      <View style={styles.metricsContainer}>
        {metrics.map((metric, index) => (
          <View key={metric.label} style={styles.metric}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>{metric.label}</Text>
              <Badge
                variant={metric.optimal ? 'success' : 'warning'}
                size="small"
              >
                {metric.optimal ? '✓' : '!'}
              </Badge>
            </View>
            <View style={styles.metricBar}>
              <View
                style={[
                  styles.metricFill,
                  {
                    width: `${metric.value}%`,
                    backgroundColor: metric.optimal 
                      ? theme.colors.success[500] 
                      : theme.colors.warning[500],
                  },
                ]}
              />
            </View>
            <Text style={[
              styles.metricMessage,
              { color: metric.optimal ? theme.colors.success[600] : theme.colors.warning[600] }
            ]}>
              {metric.message}
            </Text>
          </View>
        ))}
      </View>

      {/* Guidance Text */}
      <View style={styles.guidanceTextContainer}>
        <Text style={styles.guidanceText}>
          {captureReadiness === 100
            ? 'Perfect! Tap to capture'
            : captureReadiness > 66
            ? 'Almost there...'
            : 'Adjust position for best results'}
        </Text>
      </View>

      {/* Grid Lines (optional) */}
      <View style={styles.gridContainer}>
        <View style={[styles.gridLine, styles.gridVertical1]} />
        <View style={[styles.gridLine, styles.gridVertical2]} />
        <View style={[styles.gridLine, styles.gridHorizontal1]} />
        <View style={[styles.gridLine, styles.gridHorizontal2]} />
      </View>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    frameContainer: {
      width: screenWidth * 0.85,
      height: screenWidth * 0.65,
      alignItems: 'center',
      justifyContent: 'center',
    },
    frame: {
      width: '100%',
      height: '100%',
      borderWidth: 2,
      borderRadius: theme.borderRadius.xl,
      position: 'relative',
    },
    corner: {
      position: 'absolute',
      width: 30,
      height: 30,
      borderWidth: 3,
    },
    cornerTopLeft: {
      top: -1,
      left: -1,
      borderRightWidth: 0,
      borderBottomWidth: 0,
      borderTopLeftRadius: theme.borderRadius.xl,
    },
    cornerTopRight: {
      top: -1,
      right: -1,
      borderLeftWidth: 0,
      borderBottomWidth: 0,
      borderTopRightRadius: theme.borderRadius.xl,
    },
    cornerBottomLeft: {
      bottom: -1,
      left: -1,
      borderRightWidth: 0,
      borderTopWidth: 0,
      borderBottomLeftRadius: theme.borderRadius.xl,
    },
    cornerBottomRight: {
      bottom: -1,
      right: -1,
      borderLeftWidth: 0,
      borderTopWidth: 0,
      borderBottomRightRadius: theme.borderRadius.xl,
    },
    crosshair: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: 40,
      height: 40,
      transform: [{ translateX: -20 }, { translateY: -20 }],
    },
    crosshairLine: {
      position: 'absolute',
      opacity: 0.3,
    },
    crosshairHorizontal: {
      width: '100%',
      height: 1,
      top: '50%',
    },
    crosshairVertical: {
      width: 1,
      height: '100%',
      left: '50%',
    },
    readinessContainer: {
      position: 'absolute',
      top: 60,
      alignItems: 'center',
    },
    readinessText: {
      fontSize: 20,
      fontFamily: theme.typography.fontFamily.bold,
      fontWeight: '700',
      color: theme.colors.text.primary,
    },
    checkmark: {
      fontSize: 32,
      color: theme.colors.success[500],
      fontWeight: 'bold',
    },
    readinessLabel: {
      marginTop: theme.spacing.s,
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.textSecondary,
    },
    metricsContainer: {
      position: 'absolute',
      right: 20,
      top: '50%',
      transform: [{ translateY: -80 }],
      gap: theme.spacing.m,
    },
    metric: {
      marginBottom: theme.spacing.m,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      padding: theme.spacing.s,
      borderRadius: theme.borderRadius.md,
      minWidth: 120,
    },
    metricHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
    },
    metricLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.neutral[700],
    },
    metricBar: {
      height: 4,
      backgroundColor: theme.colors.neutral[200],
      borderRadius: 2,
      overflow: 'hidden',
      marginBottom: theme.spacing.xs,
    },
    metricFill: {
      height: '100%',
      borderRadius: 2,
    },
    metricMessage: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.regular,
    },
    guidanceTextContainer: {
      position: 'absolute',
      bottom: 100,
      paddingHorizontal: theme.spacing.xl,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      paddingVertical: theme.spacing.m,
      borderRadius: theme.borderRadius.full,
    },
    guidanceText: {
      color: '#fff',
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.medium,
      textAlign: 'center',
    },
    gridContainer: {
      ...StyleSheet.absoluteFillObject,
      opacity: 0.1,
    },
    gridLine: {
      position: 'absolute',
      backgroundColor: '#fff',
    },
    gridVertical1: {
      left: '33.33%',
      width: 1,
      height: '100%',
    },
    gridVertical2: {
      left: '66.66%',
      width: 1,
      height: '100%',
    },
    gridHorizontal1: {
      top: '33.33%',
      width: '100%',
      height: 1,
    },
    gridHorizontal2: {
      top: '66.66%',
      width: '100%',
      height: 1,
    },
  });

export default SmartCameraOverlay;