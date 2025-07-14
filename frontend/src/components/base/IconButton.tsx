import React, { useRef } from 'react';
import { TouchableOpacity, StyleSheet, Animated, ViewStyle, View, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { getModernShadow } from '@/theme/shadows';
import { moderateScale, rTouchTarget, rs } from '@/utils/responsive';
import * as Haptics from 'expo-haptics';

export type IconButtonVariant = 'filled' | 'tinted' | 'ghost' | 'gradient';
export type IconButtonSize = 'small' | 'medium' | 'large';

interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  color?: string;
  gradientColors?: readonly [string, string, ...string[]];
  disabled?: boolean;
  haptic?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  badge?: number | string;
  badgeColor?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  variant = 'ghost',
  size = 'medium',
  color,
  gradientColors,
  disabled = false,
  haptic = true,
  style,
  accessibilityLabel,
  accessibilityHint,
  badge,
  badgeColor,
}) => {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return {
          width: rTouchTarget.small,
          height: rTouchTarget.small,
          borderRadius: rTouchTarget.small / 2,
        };
      case 'large':
        return {
          width: rTouchTarget.large,
          height: rTouchTarget.large,
          borderRadius: rTouchTarget.large / 2,
        };
      default:
        return {
          width: rTouchTarget.medium,
          height: rTouchTarget.medium,
          borderRadius: rTouchTarget.medium / 2,
        };
    }
  };

  const getBackgroundStyle = (): ViewStyle => {
    const bgColor = color || theme.colors.primary[500];

    switch (variant) {
      case 'filled':
        return {
          backgroundColor: bgColor,
        };
      case 'tinted':
        return {
          backgroundColor: bgColor + '20',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
        };
      default:
        return {};
    }
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = async () => {
    if (!disabled) {
      if (haptic) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onPress();
    }
  };

  const sizeStyle = getSizeStyle();
  const backgroundStyle = getBackgroundStyle();

  const containerStyle: ViewStyle[] = [
    styles.container,
    sizeStyle,
    backgroundStyle,
    variant !== 'ghost' && getModernShadow('low'),
    disabled && styles.disabled,
    style,
  ].filter(Boolean) as ViewStyle[];

  const content = (
    <>
      {icon}
      {badge !== undefined && (
        <View style={[styles.badge, { backgroundColor: badgeColor || theme.colors.error[500] }]}>
          <Animated.Text style={styles.badgeText}>
            {typeof badge === 'number' && badge > 99 ? '99+' : badge}
          </Animated.Text>
        </View>
      )}
    </>
  );

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
      }}
    >
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        disabled={disabled}
        style={containerStyle}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole="button"
      >
        {variant === 'gradient' && gradientColors ? (
          <LinearGradient
            colors={gradientColors || [theme.colors.primary[400], theme.colors.primary[600]] as const}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFillObject, sizeStyle]}
          />
        ) : null}
        {content}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.5,
  },
  badge: {
    position: 'absolute',
    top: -moderateScale(4),
    right: -moderateScale(4),
    minWidth: moderateScale(18),
    height: moderateScale(18),
    borderRadius: moderateScale(9),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: moderateScale(4),
  },
  badgeText: {
    color: 'white',
    fontSize: moderateScale(10),
    fontWeight: 'bold',
  },
});
