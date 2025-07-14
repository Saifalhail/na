import React, { useState } from 'react';
import { borderRadius, rs } from '@/utils/responsive';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@/components/IconFallback';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';

export type AvatarSize = 'small' | 'medium' | 'large' | 'xlarge';
export type AvatarShape = 'circle' | 'square';

interface AvatarProps {
  source?: { uri: string } | number;
  name?: string;
  size?: AvatarSize;
  shape?: AvatarShape;
  showStatus?: boolean;
  status?: 'online' | 'offline' | 'away' | 'busy';
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
}

export const Avatar: React.FC<AvatarProps> = ({
  source,
  name,
  size = 'medium',
  shape = 'circle',
  showStatus = false,
  status = 'offline',
  onPress,
  style,
  textStyle,
  testID,
  accessibilityLabel,
  accessibilityHint,
  badge,
  icon,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [imageError, setImageError] = useState(false);

  const getInitials = (fullName: string): string => {
    const names = fullName.trim().split(' ');
    if (names.length === 1) {
      return names[0].substring(0, 2).toUpperCase();
    }
    return names
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const avatarStyle = [
    styles.container,
    styles[size],
    shape === 'square' && styles.square,
    style,
  ].filter(Boolean);

  const initialsStyle = [styles.initials, styles[`${size}Text`], textStyle].filter(Boolean);

  const renderContent = () => {
    if (icon) {
      return <View style={styles.iconContainer}>{icon}</View>;
    }

    if (source && !imageError) {
      return (
        <Image
          source={source}
          style={[styles.image, shape === 'square' && styles.squareImage]}
          onError={() => setImageError(true)}
          resizeMode="cover"
          testID={`${testID}-image`}
        />
      );
    }

    if (name) {
      return (
        <View style={[styles.initialsContainer, styles[`${size}InitialsContainer`]]}>
          <Text style={initialsStyle}>{getInitials(name)}</Text>
        </View>
      );
    }

    // Default user icon
    const iconSize = {
      small: 16,
      medium: 24,
      large: 32,
      xlarge: 40,
    }[size];

    return (
      <Ionicons
        name="person"
        size={iconSize}
        color={theme.colors.neutral[500]}
        style={styles.defaultIcon}
      />
    );
  };

  const content = (
    <View style={avatarStyle}>
      {renderContent()}
      {showStatus && (
        <View style={[styles.status, styles[`${size}Status`], styles[`${status}Status`]]} />
      )}
      {badge && <View style={[styles.badge, styles[`${size}Badge`]]}>{badge}</View>}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        testID={testID || 'avatar'}
        accessibilityLabel={accessibilityLabel || name || 'User avatar'}
        accessibilityHint={accessibilityHint || 'Tap to view profile'}
        accessibilityRole="button"
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View
      testID={testID || 'avatar'}
      accessibilityLabel={accessibilityLabel || name || 'User avatar'}
      accessibilityRole="image"
    >
      {content}
    </View>
  );
};

// AvatarGroup component for displaying multiple avatars
interface AvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  size?: AvatarSize;
  spacing?: number;
  style?: ViewStyle;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  children,
  max = 3,
  size = 'medium',
  spacing = -8,
  style,
}) => {
  const { theme } = useTheme();
  const childrenArray = React.Children.toArray(children);
  const visibleChildren = childrenArray.slice(0, max);
  const remainingCount = childrenArray.length - max;

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      {visibleChildren.map((child, index) => (
        <View
          key={index}
          style={[
            { marginLeft: index === 0 ? 0 : spacing },
            { zIndex: visibleChildren.length - index },
          ]}
        >
          {React.isValidElement(child) &&
            React.cloneElement(child as React.ReactElement<AvatarProps>, { size })}
        </View>
      ))}
      {remainingCount > 0 && (
        <View
          style={[
            {
              marginLeft: spacing,
              zIndex: 0,
            },
          ]}
        >
          <Avatar
            size={size}
            style={{
              backgroundColor: theme.colors.neutral[300],
            }}
            textStyle={{
              color: theme.colors.neutral[700],
              fontSize: theme.typography.fontSize.sm,
            }}
            name={`+${remainingCount}`}
          />
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      overflow: 'hidden',
      backgroundColor: theme.colors.neutral[200],
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
    },
    square: {
      borderRadius: theme.borderRadius.md,
    },

    // Sizes
    small: {
      width: 32,
      height: 32,
    },
    medium: {
      width: 48,
      height: 48,
    },
    large: {
      width: 64,
      height: 64,
    },
    xlarge: {
      width: 96,
      height: 96,
    },

    // Image
    image: {
      width: '100%',
      height: '100%',
      borderRadius: 999,
    },
    squareImage: {
      borderRadius: theme.borderRadius.md,
    },

    // Initials
    initialsContainer: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary[100],
    },
    smallInitialsContainer: {
      backgroundColor: theme.colors.primary[100],
    },
    mediumInitialsContainer: {
      backgroundColor: theme.colors.primary[100],
    },
    largeInitialsContainer: {
      backgroundColor: theme.colors.primary[100],
    },
    xlargeInitialsContainer: {
      backgroundColor: theme.colors.primary[100],
    },

    initials: {
      color: theme.colors.primary[700],
      fontFamily: theme.typography.fontFamily.medium,
      fontWeight: '600',
    },

    // Text sizes
    smallText: {
      fontSize: theme.typography.fontSize.xs,
    },
    mediumText: {
      fontSize: theme.typography.fontSize.base,
    },
    largeText: {
      fontSize: theme.typography.fontSize.xl,
    },
    xlargeText: {
      fontSize: theme.typography.fontSize['2xl'],
    },

    // Icon
    iconContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    defaultIcon: {
      backgroundColor: 'transparent',
    },

    // Status indicator
    status: {
      position: 'absolute',
      borderWidth: 2,
      borderColor: theme.colors.background,
      borderRadius: 999,
    },
    smallStatus: {
      width: 8,
      height: 8,
      bottom: 0,
      right: 0,
    },
    mediumStatus: {
      width: 12,
      height: 12,
      bottom: 0,
      right: 0,
    },
    largeStatus: {
      width: 16,
      height: 16,
      bottom: 2,
      right: 2,
    },
    xlargeStatus: {
      width: 20,
      height: 20,
      bottom: 4,
      right: 4,
    },
    onlineStatus: {
      backgroundColor: theme.colors.success[500],
    },
    offlineStatus: {
      backgroundColor: theme.colors.neutral[400],
    },
    awayStatus: {
      backgroundColor: theme.colors.warning[500],
    },
    busyStatus: {
      backgroundColor: theme.colors.error[500],
    },

    // Badge
    badge: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    smallBadge: {
      top: -4,
      right: -4,
    },
    mediumBadge: {
      top: -4,
      right: -4,
    },
    largeBadge: {
      top: -4,
      right: -4,
    },
    xlargeBadge: {
      top: -4,
      right: -4,
    },
  });

export default Avatar;
