import React, { useEffect, useRef, useState } from 'react';
import { borderRadius, rs } from '@/utils/responsive';
import { View, Text, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';

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

const SmartCameraOverlayComponent: React.FC<SmartCameraOverlayProps> = ({
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

  // Simplified state - assume optimal after 1 second
  const [isOptimal, setIsOptimal] = useState(false);

  // Simplified optimal detection
  useEffect(() => {
    if (showGuidance) {
      const timer = setTimeout(() => {
        setIsOptimal(true);
        onOptimalPosition?.();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [showGuidance, onOptimalPosition]);

  if (!showGuidance) return null;

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      {/* Simple center frame */}
      <View style={styles.centerContainer}>
        <View style={[
          styles.simpleFrame, 
          { borderColor: isOptimal ? theme.colors.success[500] : theme.colors.neutral[400] }
        ]}>
          {/* Corner indicators */}
          <View style={[styles.corner, styles.topLeft, { borderColor: isOptimal ? theme.colors.success[500] : theme.colors.neutral[400] }]} />
          <View style={[styles.corner, styles.topRight, { borderColor: isOptimal ? theme.colors.success[500] : theme.colors.neutral[400] }]} />
          <View style={[styles.corner, styles.bottomLeft, { borderColor: isOptimal ? theme.colors.success[500] : theme.colors.neutral[400] }]} />
          <View style={[styles.corner, styles.bottomRight, { borderColor: isOptimal ? theme.colors.success[500] : theme.colors.neutral[400] }]} />
        </View>
      </View>
      
      {/* Simple status message */}
      <View style={styles.messageContainer}>
        <Text style={[styles.message, { color: theme.colors.text.inverse }]}>
          {isOptimal ? 'Perfect! Tap to capture' : 'Position your meal in the frame'}
        </Text>
      </View>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    centerContainer: {
      width: screenWidth * 0.8,
      height: screenWidth * 0.6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    simpleFrame: {
      width: '100%',
      height: '100%',
      borderWidth: 2,
      borderRadius: 20,
      position: 'relative',
    },
    corner: {
      position: 'absolute',
      width: 30,
      height: 30,
      borderWidth: 4,
    },
    topLeft: {
      top: -4,
      left: -4,
      borderRightWidth: 0,
      borderBottomWidth: 0,
      borderTopLeftRadius: 20,
    },
    topRight: {
      top: -4,
      right: -4,
      borderLeftWidth: 0,
      borderBottomWidth: 0,
      borderTopRightRadius: 20,
    },
    bottomLeft: {
      bottom: -4,
      left: -4,
      borderRightWidth: 0,
      borderTopWidth: 0,
      borderBottomLeftRadius: 20,
    },
    bottomRight: {
      bottom: -4,
      right: -4,
      borderLeftWidth: 0,
      borderTopWidth: 0,
      borderBottomRightRadius: 20,
    },
    messageContainer: {
      position: 'absolute',
      bottom: 150,
      left: 40,
      right: 40,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 20,
    },
    message: {
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
  });

// Memoize the component with custom comparison
export const SmartCameraOverlay = React.memo(SmartCameraOverlayComponent, (prevProps, nextProps) => {
  // Compare primitive props
  const primitivesEqual =
    prevProps.brightness === nextProps.brightness &&
    prevProps.distance === nextProps.distance &&
    prevProps.angle === nextProps.angle &&
    prevProps.isCapturing === nextProps.isCapturing &&
    prevProps.showGuidance === nextProps.showGuidance;

  // Compare callback reference
  const callbackEqual = prevProps.onOptimalPosition === nextProps.onOptimalPosition;

  // Compare style (shallow comparison)
  const styleEqual = prevProps.style === nextProps.style;

  return primitivesEqual && callbackEqual && styleEqual;
});

export default SmartCameraOverlay;
