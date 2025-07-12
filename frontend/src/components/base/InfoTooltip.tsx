import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ViewStyle,
  TextStyle,
  LayoutChangeEvent,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';

export type TooltipTrigger = 'press' | 'longPress';
export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right' | 'auto';

interface InfoTooltipProps {
  children: React.ReactNode;
  content: string;
  trigger?: TooltipTrigger;
  position?: TooltipPosition;
  maxWidth?: number;
  disabled?: boolean;
  style?: ViewStyle;
  tooltipStyle?: ViewStyle;
  textStyle?: TextStyle;
  showArrow?: boolean;
  backgroundColor?: string;
  textColor?: string;
  testID?: string;
  accessibilityLabel?: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TOOLTIP_PADDING = 12;
const ARROW_SIZE = 8;
const EDGE_MARGIN = 16;

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  children,
  content,
  trigger = 'press',
  position = 'auto',
  maxWidth = 250,
  disabled = false,
  style,
  tooltipStyle,
  textStyle,
  showArrow = true,
  backgroundColor,
  textColor,
  testID,
  accessibilityLabel,
}) => {
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipLayout, setTooltipLayout] = useState({ width: 0, height: 0 });
  const [targetLayout, setTargetLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [calculatedPosition, setCalculatedPosition] = useState<TooltipPosition>('top');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const targetRef = useRef<View>(null);

  const styles = createStyles(theme, backgroundColor, textColor);

  const calculateOptimalPosition = (
    targetLayout: { x: number; y: number; width: number; height: number },
    tooltipLayout: { width: number; height: number }
  ): TooltipPosition => {
    if (position !== 'auto') return position;

    const spaceAbove = targetLayout.y;
    const spaceBelow = SCREEN_HEIGHT - (targetLayout.y + targetLayout.height);
    const spaceLeft = targetLayout.x;
    const spaceRight = SCREEN_WIDTH - (targetLayout.x + targetLayout.width);

    const tooltipHeight = tooltipLayout.height + (showArrow ? ARROW_SIZE : 0);
    const tooltipWidth = tooltipLayout.width + (showArrow ? ARROW_SIZE : 0);

    // Prefer top/bottom positions
    if (spaceAbove >= tooltipHeight + EDGE_MARGIN) return 'top';
    if (spaceBelow >= tooltipHeight + EDGE_MARGIN) return 'bottom';
    if (spaceRight >= tooltipWidth + EDGE_MARGIN) return 'right';
    if (spaceLeft >= tooltipWidth + EDGE_MARGIN) return 'left';

    // Fallback to position with most space
    if (spaceAbove >= spaceBelow) return 'top';
    return 'bottom';
  };

  const getTooltipStyle = () => {
    if (!targetLayout.width || !tooltipLayout.width) return { opacity: 0 };

    const arrowOffset = showArrow ? ARROW_SIZE : 0;
    let left = 0;
    let top = 0;

    switch (calculatedPosition) {
      case 'top':
        left = targetLayout.x + targetLayout.width / 2 - tooltipLayout.width / 2;
        top = targetLayout.y - tooltipLayout.height - arrowOffset;
        break;
      case 'bottom':
        left = targetLayout.x + targetLayout.width / 2 - tooltipLayout.width / 2;
        top = targetLayout.y + targetLayout.height + arrowOffset;
        break;
      case 'left':
        left = targetLayout.x - tooltipLayout.width - arrowOffset;
        top = targetLayout.y + targetLayout.height / 2 - tooltipLayout.height / 2;
        break;
      case 'right':
        left = targetLayout.x + targetLayout.width + arrowOffset;
        top = targetLayout.y + targetLayout.height / 2 - tooltipLayout.height / 2;
        break;
    }

    // Ensure tooltip stays within screen bounds
    left = Math.max(EDGE_MARGIN, Math.min(left, SCREEN_WIDTH - tooltipLayout.width - EDGE_MARGIN));
    top = Math.max(EDGE_MARGIN, Math.min(top, SCREEN_HEIGHT - tooltipLayout.height - EDGE_MARGIN));

    return {
      position: 'absolute' as const,
      left,
      top,
      opacity: 1,
    };
  };

  const getArrowStyle = () => {
    if (!showArrow || !targetLayout.width || !tooltipLayout.width) return { opacity: 0 };

    const arrowSize = ARROW_SIZE;
    let left = 0;
    let top = 0;
    let rotation = '0deg';

    const tooltipPosition = getTooltipStyle();
    const centerX = targetLayout.x + targetLayout.width / 2;
    const centerY = targetLayout.y + targetLayout.height / 2;

    switch (calculatedPosition) {
      case 'top':
        left = centerX - arrowSize / 2;
        top = (tooltipPosition.top as number) + tooltipLayout.height;
        rotation = '0deg';
        break;
      case 'bottom':
        left = centerX - arrowSize / 2;
        top = (tooltipPosition.top as number) - arrowSize;
        rotation = '180deg';
        break;
      case 'left':
        left = (tooltipPosition.left as number) + tooltipLayout.width;
        top = centerY - arrowSize / 2;
        rotation = '270deg';
        break;
      case 'right':
        left = (tooltipPosition.left as number) - arrowSize;
        top = centerY - arrowSize / 2;
        rotation = '90deg';
        break;
    }

    return {
      position: 'absolute' as const,
      left,
      top,
      transform: [{ rotate: rotation }],
      opacity: 1,
    };
  };

  const showTooltip = () => {
    if (disabled || !content.trim()) return;

    targetRef.current?.measure((x, y, width, height, pageX, pageY) => {
      setTargetLayout({ x: pageX, y: pageY, width, height });
      setIsVisible(true);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const hideTooltip = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsVisible(false);
    });
  };

  const onTooltipLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    const newLayout = { width, height };
    setTooltipLayout(newLayout);

    if (targetLayout.width) {
      const newPosition = calculateOptimalPosition(targetLayout, newLayout);
      setCalculatedPosition(newPosition);
    }
  };

  const handlePress = () => {
    if (trigger === 'press') {
      isVisible ? hideTooltip() : showTooltip();
    }
  };

  const handleLongPress = () => {
    if (trigger === 'longPress') {
      showTooltip();
    }
  };

  const handlePressOut = () => {
    if (trigger === 'longPress' && isVisible) {
      hideTooltip();
    }
  };

  return (
    <>
      <TouchableOpacity
        ref={targetRef as any}
        onPress={handlePress}
        onLongPress={handleLongPress}
        onPressOut={handlePressOut}
        style={style}
        activeOpacity={0.7}
        testID={testID}
        accessibilityLabel={accessibilityLabel || `Tooltip trigger: ${content}`}
        accessibilityRole="button"
        accessibilityHint={`${trigger === 'press' ? 'Tap' : 'Long press'} to show tooltip`}
      >
        {children}
      </TouchableOpacity>

      {isVisible && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Animated.View
            style={[
              styles.tooltip,
              tooltipStyle,
              getTooltipStyle(),
              {
                maxWidth,
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
            onLayout={onTooltipLayout}
          >
            <Text style={[styles.tooltipText, textStyle]} numberOfLines={0}>
              {content}
            </Text>
          </Animated.View>

          {showArrow && (
            <Animated.View
              style={[
                styles.arrow,
                getArrowStyle(),
                {
                  opacity: fadeAnim,
                  transform: [
                    ...(getArrowStyle().transform || []),
                    { scale: scaleAnim },
                  ],
                },
              ]}
            />
          )}
        </View>
      )}
    </>
  );
};

const createStyles = (theme: Theme, backgroundColor?: string, textColor?: string) =>
  StyleSheet.create({
    tooltip: {
      backgroundColor: backgroundColor || theme.colors.neutral[800],
      borderRadius: 8,
      paddingHorizontal: TOOLTIP_PADDING,
      paddingVertical: TOOLTIP_PADDING * 0.75,
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    tooltipText: {
      color: textColor || theme.colors.neutral[100],
      fontSize: 14,
      lineHeight: 18,
      textAlign: 'center',
    },
    arrow: {
      width: 0,
      height: 0,
      borderLeftWidth: ARROW_SIZE,
      borderRightWidth: ARROW_SIZE,
      borderTopWidth: ARROW_SIZE,
      borderStyle: 'solid',
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderTopColor: backgroundColor || theme.colors.neutral[800],
    },
  });