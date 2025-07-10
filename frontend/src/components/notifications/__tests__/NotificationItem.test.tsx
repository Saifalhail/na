import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { NotificationItem } from '../NotificationItem';
import { ThemeProvider } from '@/theme/ThemeContext';
import type { Notification } from '@/types/api';

// Mock theme hook
jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        primary: {
          50: '#E3F2FD',
          500: '#2196F3',
        },
        text: '#000000',
        textSecondary: '#666666',
      },
    },
  }),
}));

// Mock Card component
jest.mock('@/components/base/Card', () => ({
  Card: ({ children, style }: any) => (
    <div style={style} data-testid="card">
      {children}
    </div>
  ),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('NotificationItem', () => {
  const mockNotification: Notification = {
    id: '1',
    title: 'Test Notification',
    message: 'This is a test notification message',
    notification_type: 'meal_reminder',
    is_read: false,
    created_at: new Date().toISOString(),
    action_url: '/meals',
    priority: 'medium',
  };

  const renderWithTheme = (component: React.ReactElement) => {
    return render(<ThemeProvider>{component}</ThemeProvider>);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders notification correctly', () => {
    renderWithTheme(<NotificationItem notification={mockNotification} />);

    expect(screen.getByText('Test Notification')).toBeTruthy();
    expect(screen.getByText('This is a test notification message')).toBeTruthy();
    expect(screen.getByText('🍽️')).toBeTruthy(); // meal_reminder icon
  });

  it('displays correct time format', () => {
    const testCases = [
      { minutes: 0, expected: 'Just now' },
      { minutes: 30, expected: '30m ago' },
      { minutes: 120, expected: '2h ago' },
      { minutes: 1440, expected: '1d ago' },
      { minutes: 2880, expected: '2d ago' },
    ];

    testCases.forEach(({ minutes, expected }) => {
      const date = new Date();
      date.setMinutes(date.getMinutes() - minutes);
      const notification = {
        ...mockNotification,
        created_at: date.toISOString(),
      };

      const { rerender } = renderWithTheme(<NotificationItem notification={notification} />);

      expect(screen.getByText(expected)).toBeTruthy();
      rerender(<></>); // Clear for next test
    });
  });

  it('displays correct icon for notification types', () => {
    const iconMap = {
      meal_reminder: '🍽️',
      daily_summary: '📊',
      weekly_report: '📈',
      achievement: '🏆',
      streak: '🔥',
      tip: '💡',
      system: '⚙️',
      promotional: '🎉',
      unknown: '📱',
    };

    Object.entries(iconMap).forEach(([type, icon]) => {
      const notification = {
        ...mockNotification,
        notification_type: type,
      };

      const { rerender } = renderWithTheme(<NotificationItem notification={notification} />);

      expect(screen.getByText(icon)).toBeTruthy();
      rerender(<></>);
    });
  });

  it('applies unread styles correctly', () => {
    const { rerender } = renderWithTheme(<NotificationItem notification={mockNotification} />);

    const card = screen.getByTestId('card');
    expect(card.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: '#E3F2FD',
          borderLeftWidth: 4,
          borderLeftColor: '#2196F3',
        }),
      ])
    );

    // Test read notification
    const readNotification = { ...mockNotification, is_read: true };
    rerender(<NotificationItem notification={readNotification} />);

    const readCard = screen.getByTestId('card');
    expect(readCard.props.style).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: '#E3F2FD',
        }),
      ])
    );
  });

  it('calls onPress and marks as read when pressed', () => {
    const onPress = jest.fn();
    const onMarkAsRead = jest.fn();

    renderWithTheme(
      <NotificationItem
        notification={mockNotification}
        onPress={onPress}
        onMarkAsRead={onMarkAsRead}
      />
    );

    const touchable = screen.getByText('Test Notification').parent?.parent;
    fireEvent.press(touchable!);

    expect(onMarkAsRead).toHaveBeenCalledWith(mockNotification);
    expect(onPress).toHaveBeenCalledWith(mockNotification);
  });

  it('does not call onMarkAsRead for already read notifications', () => {
    const onPress = jest.fn();
    const onMarkAsRead = jest.fn();
    const readNotification = { ...mockNotification, is_read: true };

    renderWithTheme(
      <NotificationItem
        notification={readNotification}
        onPress={onPress}
        onMarkAsRead={onMarkAsRead}
      />
    );

    const touchable = screen.getByText('Test Notification').parent?.parent;
    fireEvent.press(touchable!);

    expect(onMarkAsRead).not.toHaveBeenCalled();
    expect(onPress).toHaveBeenCalledWith(readNotification);
  });

  it('shows alert with action URL when no onPress provided', () => {
    renderWithTheme(<NotificationItem notification={mockNotification} />);

    const touchable = screen.getByText('Test Notification').parent?.parent;
    fireEvent.press(touchable!);

    expect(Alert.alert).toHaveBeenCalledWith('Navigation', 'Would navigate to: /meals');
  });

  it('shows options on long press', () => {
    const onMarkAsRead = jest.fn();
    const onDelete = jest.fn();

    renderWithTheme(
      <NotificationItem
        notification={mockNotification}
        onMarkAsRead={onMarkAsRead}
        onDelete={onDelete}
      />
    );

    const touchable = screen.getByText('Test Notification').parent?.parent;
    fireEvent(touchable!, 'longPress');

    expect(Alert.alert).toHaveBeenCalledWith(
      'Notification Options',
      '',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Mark as Read' }),
        expect.objectContaining({ text: 'Delete', style: 'destructive' }),
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
      ])
    );
  });

  it('does not show Mark as Read option for read notifications', () => {
    const onDelete = jest.fn();
    const readNotification = { ...mockNotification, is_read: true };

    renderWithTheme(<NotificationItem notification={readNotification} onDelete={onDelete} />);

    const touchable = screen.getByText('Test Notification').parent?.parent;
    fireEvent(touchable!, 'longPress');

    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const options = alertCall[2];

    expect(options).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ text: 'Mark as Read' })])
    );
    expect(options).toEqual(expect.arrayContaining([expect.objectContaining({ text: 'Delete' })]));
  });

  it('truncates long titles and messages', () => {
    const longNotification = {
      ...mockNotification,
      title: 'This is a very long notification title that should be truncated',
      message:
        'This is a very long notification message that should be truncated to fit within two lines of text in the notification item component',
    };

    renderWithTheme(<NotificationItem notification={longNotification} />);

    const title = screen.getByText(longNotification.title);
    const message = screen.getByText(longNotification.message);

    expect(title.props.numberOfLines).toBe(1);
    expect(message.props.numberOfLines).toBe(2);
  });

  it('shows unread dot for unread notifications', () => {
    renderWithTheme(<NotificationItem notification={mockNotification} />);

    // Look for the unread dot view
    const views = screen.getAllByTestId('card').flatMap((card) => card.children);

    const unreadDot = views.find((view) =>
      view.props?.style?.some?.(
        (s: any) => s?.backgroundColor === '#2196F3' && s?.width === 8 && s?.height === 8
      )
    );

    expect(unreadDot).toBeTruthy();
  });
});
