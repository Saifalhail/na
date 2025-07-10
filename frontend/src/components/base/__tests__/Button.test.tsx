import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

// Simple test wrapper since ThemeProvider is mocked
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;

describe('Button', () => {
  it('renders correctly with default props', () => {
    const { getByText } = render(
      <TestWrapper>
        <Button>Test Button</Button>
      </TestWrapper>
    );

    expect(getByText('Test Button')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <TestWrapper>
        <Button onPress={onPressMock}>Test Button</Button>
      </TestWrapper>
    );

    fireEvent.press(getByText('Test Button'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <TestWrapper>
        <Button onPress={onPressMock} disabled>
          Test Button
        </Button>
      </TestWrapper>
    );

    fireEvent.press(getByText('Test Button'));
    expect(onPressMock).not.toHaveBeenCalled();
  });

  it('shows loading indicator when loading', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <Button loading>Test Button</Button>
      </TestWrapper>
    );

    // ActivityIndicator should be present
    expect(getByTestId('activity-indicator')).toBeTruthy();
  });

  it('does not call onPress when loading', () => {
    const onPressMock = jest.fn();
    const { getByTestId } = render(
      <TestWrapper>
        <Button onPress={onPressMock} loading>
          Test Button
        </Button>
      </TestWrapper>
    );

    fireEvent.press(getByTestId('activity-indicator'));
    expect(onPressMock).not.toHaveBeenCalled();
  });

  it('renders with different variants', () => {
    const variants = ['primary', 'secondary', 'outline', 'text', 'danger'] as const;

    variants.forEach((variant) => {
      const { getByText } = render(
        <TestWrapper>
          <Button variant={variant}>Test Button</Button>
        </TestWrapper>
      );

      expect(getByText('Test Button')).toBeTruthy();
    });
  });

  it('renders with different sizes', () => {
    const sizes = ['small', 'medium', 'large'] as const;

    sizes.forEach((size) => {
      const { getByText } = render(
        <TestWrapper>
          <Button size={size}>Test Button</Button>
        </TestWrapper>
      );

      expect(getByText('Test Button')).toBeTruthy();
    });
  });

  it('renders with full width', () => {
    const { getByText } = render(
      <TestWrapper>
        <Button fullWidth>Test Button</Button>
      </TestWrapper>
    );

    const button = getByText('Test Button').parent;
    expect(button?.props.style).toContainEqual(expect.objectContaining({ width: '100%' }));
  });

  it('renders with icon on left side', () => {
    const IconComponent = () => <></>;
    const { getByText } = render(
      <TestWrapper>
        <Button icon={<IconComponent />} iconPosition="left">
          Test Button
        </Button>
      </TestWrapper>
    );

    expect(getByText('Test Button')).toBeTruthy();
  });

  it('renders with icon on right side', () => {
    const IconComponent = () => <></>;
    const { getByText } = render(
      <TestWrapper>
        <Button icon={<IconComponent />} iconPosition="right">
          Test Button
        </Button>
      </TestWrapper>
    );

    expect(getByText('Test Button')).toBeTruthy();
  });
});
