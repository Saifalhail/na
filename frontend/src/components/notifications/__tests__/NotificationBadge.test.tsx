import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { NotificationBadge } from '../NotificationBadge';
import { ThemeProvider } from '@/theme/ThemeContext';

// Mock theme hook
jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        error: {
          500: '#FF0000',
        },
        white: '#FFFFFF',
      },
    },
  }),
}));

describe('NotificationBadge', () => {
  const renderWithTheme = (component: React.ReactElement) => {
    return render(<ThemeProvider>{component}</ThemeProvider>);
  };

  it('renders badge with count', () => {
    renderWithTheme(<NotificationBadge count={5} />);

    expect(screen.getByText('5')).toBeTruthy();
  });

  it('does not render when count is 0 and showZero is false', () => {
    const { container } = renderWithTheme(<NotificationBadge count={0} />);

    expect(container.children.length).toBe(0);
  });

  it('renders when count is 0 and showZero is true', () => {
    renderWithTheme(<NotificationBadge count={0} showZero />);

    expect(screen.getByText('0')).toBeTruthy();
  });

  it('displays maxCount+ when count exceeds maxCount', () => {
    renderWithTheme(<NotificationBadge count={150} maxCount={99} />);

    expect(screen.getByText('99+')).toBeTruthy();
  });

  it('uses custom maxCount', () => {
    renderWithTheme(<NotificationBadge count={12} maxCount={10} />);

    expect(screen.getByText('10+')).toBeTruthy();
  });

  it('applies correct size styles', () => {
    const { rerender } = renderWithTheme(<NotificationBadge count={5} size="small" />);

    let badge = screen.getByText('5').parent;
    expect(badge?.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          width: 16,
          height: 16,
          borderRadius: 8,
        }),
      ])
    );

    rerender(<NotificationBadge count={5} size="large" />);

    badge = screen.getByText('5').parent;
    expect(badge?.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          width: 24,
          height: 24,
          borderRadius: 12,
        }),
      ])
    );
  });

  it('applies custom styles', () => {
    const customStyle = { marginLeft: 10 };
    renderWithTheme(<NotificationBadge count={5} style={customStyle} />);

    const badge = screen.getByText('5').parent;
    expect(badge?.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining(customStyle)])
    );
  });

  it('handles large numbers correctly', () => {
    renderWithTheme(<NotificationBadge count={999} maxCount={999} />);

    expect(screen.getByText('999')).toBeTruthy();
  });

  it('renders with medium size by default', () => {
    renderWithTheme(<NotificationBadge count={5} />);

    const badge = screen.getByText('5').parent;
    expect(badge?.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          width: 20,
          height: 20,
          borderRadius: 10,
        }),
      ])
    );
  });
});
