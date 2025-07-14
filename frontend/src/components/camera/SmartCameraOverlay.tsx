import React, { useEffect, useRef, useState } from 'react';
import { borderRadius, rs } from '@/utils/responsive';
import { View, Text, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';
import { ProgressRing } from '@/components/base/ProgressRing';
import { Badge } from '@/components/base/Badge';
import { Container, Row, Column, Spacer } from '@/components/layout';

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
      message:
        distance === 'too_close' ? 'Move back' : distance === 'too_far' ? 'Move closer' : 'Perfect',
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
    const optimalCount = metrics.filter((m) => m.optimal).length;
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

  const frameColor =
    captureReadiness === 100
      ? theme.colors.success[500]
      : captureReadiness > 66
        ? theme.colors.warning[500]
        : theme.colors.neutral[300];

  return (
    <Container safe={false} padding="none" style={[styles.container, style]} pointerEvents="none">
      {/* Top Status Bar */}
      <Row justify="center" style={styles.topSection}>
        <View style={styles.readinessContainer}>
          <ProgressRing
            progress={captureReadiness}
            size={60}
            strokeWidth={4}
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
        </View>
      </Row>

      <Spacer size="small" />

      {/* Main Camera Frame Area */}
      <Column align="center" justify="center" style={styles.mainSection}>
        {/* Simplified Frame */}
        <Animated.View
          style={[
            styles.frameContainer,
            {
              opacity: frameCornerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.7, 1],
              }),
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <View style={[styles.frame, { borderColor: frameColor }]}>
            {/* Simple corner indicators */}
            <View style={[styles.corner, styles.cornerTopLeft, { borderColor: frameColor }]} />
            <View style={[styles.corner, styles.cornerTopRight, { borderColor: frameColor }]} />
            <View style={[styles.corner, styles.cornerBottomLeft, { borderColor: frameColor }]} />
            <View style={[styles.corner, styles.cornerBottomRight, { borderColor: frameColor }]} />
          </View>
        </Animated.View>

        {/* Subtle grid overlay */}
        <View style={styles.gridContainer}>
          <View style={[styles.gridLine, styles.gridVertical1]} />
          <View style={[styles.gridLine, styles.gridVertical2]} />
          <View style={[styles.gridLine, styles.gridHorizontal1]} />
          <View style={[styles.gridLine, styles.gridHorizontal2]} />
        </View>
      </Column>

      <Spacer size="small" />

      {/* Bottom Status Section */}
      <Column align="center" style={styles.bottomSection}>
        {/* Compact Metrics Row */}
        <Row justify="center" gap={12} style={styles.metricsRow}>
          {metrics.map((metric) => (
            <View key={metric.label} style={styles.compactMetric}>
              <Badge variant={metric.optimal ? 'success' : 'warning'} size="small">
                {metric.optimal ? '✓' : '!'}
              </Badge>
              <Text style={styles.compactMetricLabel}>{metric.label}</Text>
            </View>
          ))}
        </Row>

        <Spacer size="xs" />

        {/* Status Message */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            {captureReadiness === 100
              ? 'Perfect! Tap to capture'
              : captureReadiness > 66
                ? 'Almost there...'
                : 'Adjust position for best results'}
          </Text>
        </View>
      </Column>
    </Container>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFillObject,
      paddingTop: 60,
      paddingBottom: 120,
      paddingHorizontal: theme.spacing.m,
    },
    topSection: {
      height: 80,
    },
    mainSection: {
      flex: 1,
      position: 'relative',
    },
    bottomSection: {
      height: 80,
    },
    frameContainer: {
      width: screenWidth * 0.75,
      height: screenWidth * 0.55,
      alignItems: 'center',
      justifyContent: 'center',
    },
    frame: {
      width: '100%',
      height: '100%',
      borderWidth: 2,
      borderRadius: theme.borderRadius.lg,
      position: 'relative',
    },
    corner: {
      position: 'absolute',
      width: 24,
      height: 24,
      borderWidth: 3,
    },
    cornerTopLeft: {
      top: -2,
      left: -2,
      borderRightWidth: 0,
      borderBottomWidth: 0,
      borderTopLeftRadius: theme.borderRadius.lg,
    },
    cornerTopRight: {
      top: -2,
      right: -2,
      borderLeftWidth: 0,
      borderBottomWidth: 0,
      borderTopRightRadius: theme.borderRadius.lg,
    },
    cornerBottomLeft: {
      bottom: -2,
      left: -2,
      borderRightWidth: 0,
      borderTopWidth: 0,
      borderBottomLeftRadius: theme.borderRadius.lg,
    },
    cornerBottomRight: {
      bottom: -2,
      right: -2,
      borderLeftWidth: 0,
      borderTopWidth: 0,
      borderBottomRightRadius: theme.borderRadius.lg,
    },
    readinessContainer: {
      alignItems: 'center',
    },
    readinessText: {
      fontSize: 16,
      fontFamily: theme.typography.fontFamily.bold,
      fontWeight: '700',
      color: theme.colors.text.primary,
    },
    checkmark: {
      fontSize: 24,
      color: theme.colors.success[500],
      fontWeight: 'bold',
    },
    metricsRow: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      paddingHorizontal: theme.spacing.m,
      paddingVertical: theme.spacing.s,
      borderRadius: theme.borderRadius.full,
    },
    compactMetric: {
      alignItems: 'center',
      gap: 4,
    },
    compactMetricLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.neutral[600],
    },
    statusContainer: {
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      paddingHorizontal: theme.spacing.l,
      paddingVertical: theme.spacing.s,
      borderRadius: theme.borderRadius.full,
    },
    statusText: {
      color: '#fff',
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.medium,
      textAlign: 'center',
    },
    gridContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      opacity: 0.15,
    },
    gridLine: {
      position: 'absolute',
      backgroundColor: '#fff',
    },
    gridVertical1: {
      left: '33.3%',
      width: 1,
      height: '100%',
    },
    gridVertical2: {
      left: '66.7%',
      width: 1,
      height: '100%',
    },
    gridHorizontal1: {
      top: '33.3%',
      width: '100%',
      height: 1,
    },
    gridHorizontal2: {
      top: '66.7%',
      width: '100%',
      height: 1,
    },
  });

export default SmartCameraOverlay;
