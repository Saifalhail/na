import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface NotificationBadgeProps {
  count: number;
  maxCount?: number;
  showZero?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  maxCount = 99,
  showZero = false,
  size = 'medium',
  style,
}) => {
  const { theme } = useTheme();

  if (count === 0 && !showZero) {
    return null;
  }

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  const badgeSize = {
    small: 16,
    medium: 20,
    large: 24,
  }[size];

  const fontSize = {
    small: 10,
    medium: 12,
    large: 14,
  }[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: theme.colors.error[500],
          width: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize / 2,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: theme.colors.white,
            fontSize,
          },
        ]}
        numberOfLines={1}
      >
        {displayCount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 16,
  },
  text: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
