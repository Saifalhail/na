import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/base/Card';
import type { Notification } from '@/types/api';

interface NotificationItemProps {
  notification: Notification;
  onPress?: (notification: Notification) => void;
  onMarkAsRead?: (notification: Notification) => void;
  onDelete?: (notification: Notification) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
  onMarkAsRead,
  onDelete,
}) => {
  const { theme } = useTheme();

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      // 24 hours
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days}d ago`;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'meal_reminder':
        return '🍽️';
      case 'daily_summary':
        return '📊';
      case 'weekly_report':
        return '📈';
      case 'achievement':
        return '🏆';
      case 'streak':
        return '🔥';
      case 'tip':
        return '💡';
      case 'system':
        return '⚙️';
      case 'promotional':
        return '🎉';
      default:
        return '📱';
    }
  };

  const handlePress = () => {
    if (!notification.is_read && onMarkAsRead) {
      onMarkAsRead(notification);
    }

    if (onPress) {
      onPress(notification);
    } else if (notification.action_url) {
      // Handle navigation to action URL
      Alert.alert('Navigation', `Would navigate to: ${notification.action_url}`);
    }
  };

  const handleLongPress = () => {
    const options = [];

    if (!notification.is_read && onMarkAsRead) {
      options.push({
        text: 'Mark as Read',
        onPress: () => onMarkAsRead(notification),
      });
    }

    if (onDelete) {
      options.push({
        text: 'Delete',
        style: 'destructive' as const,
        onPress: () => onDelete(notification),
      });
    }

    options.push({ text: 'Cancel', style: 'cancel' as const });

    Alert.alert('Notification Options', '', options);
  };

  return (
    <Card
      style={[
        styles.container,
        !notification.is_read && {
          backgroundColor: theme.colors.primary[50],
          borderLeftWidth: 4,
          borderLeftColor: theme.colors.primary[500],
        },
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={handleLongPress}
        style={styles.content}
        activeOpacity={0.7}
      >
        <View style={styles.header}>
          <Text style={styles.icon}>{getNotificationIcon(notification.notification_type)}</Text>
          <View style={styles.headerText}>
            <Text
              style={[
                styles.title,
                { color: theme.colors.text.primary },
                !notification.is_read && styles.unreadTitle,
              ]}
              numberOfLines={1}
            >
              {notification.title}
            </Text>
            <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
              {formatTime(notification.created_at)}
            </Text>
          </View>
          {!notification.is_read && (
            <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary[500] }]} />
          )}
        </View>

        <Text style={[styles.message, { color: theme.colors.textSecondary }]} numberOfLines={2}>
          {notification.message}
        </Text>
      </TouchableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    padding: 0,
    overflow: 'hidden',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  unreadTitle: {
    fontWeight: 'bold',
  },
  time: {
    fontSize: 12,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 32, // Align with title (icon width + margin)
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    marginTop: 6,
  },
});
