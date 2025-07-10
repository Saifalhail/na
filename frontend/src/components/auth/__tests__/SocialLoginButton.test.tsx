import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { SocialLoginButton } from '../SocialLoginButton';

// Create a test wrapper to provide theme context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

describe('SocialLoginButton', () => {
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Google sign-in button correctly', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <SocialLoginButton
          provider="google"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      </TestWrapper>
    );

    expect(getByTestId('social-login-button')).toBeTruthy();
  });

  it('calls Google sign-in when pressed', async () => {
    const mockUser = {
      user: {
        id: '123',
        name: 'Test User',
        email: 'test@example.com',
        photo: 'https://example.com/photo.jpg',
      },
      idToken: 'mock-id-token',
      accessToken: 'mock-access-token',
    };

    (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(true);
    (GoogleSignin.signIn as jest.Mock).mockResolvedValue(mockUser);

    const { getByTestId } = render(
      <TestWrapper>
        <SocialLoginButton
          provider="google"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      </TestWrapper>
    );

    const button = getByTestId('social-login-button');
    fireEvent.press(button);

    await waitFor(() => {
      expect(GoogleSignin.hasPlayServices).toHaveBeenCalled();
      expect(GoogleSignin.signIn).toHaveBeenCalled();
      expect(mockOnSuccess).toHaveBeenCalledWith(mockUser);
    });
  });

  it('handles Google sign-in cancellation', async () => {
    const error = { code: statusCodes.SIGN_IN_CANCELLED };
    
    (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(true);
    (GoogleSignin.signIn as jest.Mock).mockRejectedValue(error);

    const { getByTestId } = render(
      <TestWrapper>
        <SocialLoginButton
          provider="google"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      </TestWrapper>
    );

    const button = getByTestId('social-login-button');
    fireEvent.press(button);

    await waitFor(() => {
      expect(mockOnError).not.toHaveBeenCalled();
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  it('handles Google sign-in errors', async () => {
    const error = { code: 'UNKNOWN_ERROR', message: 'Something went wrong' };
    
    (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(true);
    (GoogleSignin.signIn as jest.Mock).mockRejectedValue(error);
    jest.spyOn(Alert, 'alert');

    const { getByTestId } = render(
      <TestWrapper>
        <SocialLoginButton
          provider="google"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      </TestWrapper>
    );

    const button = getByTestId('social-login-button');
    fireEvent.press(button);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Sign In Failed',
        'Failed to sign in with Google. Please try again.'
      );
      expect(mockOnError).toHaveBeenCalledWith('Failed to sign in with Google. Please try again.');
    });
  });

  it('handles Play Services not available', async () => {
    (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(false);
    jest.spyOn(Alert, 'alert');

    const { getByTestId } = render(
      <TestWrapper>
        <SocialLoginButton
          provider="google"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      </TestWrapper>
    );

    const button = getByTestId('social-login-button');
    fireEvent.press(button);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Google Play Services',
        'Google Play Services are not available on this device.'
      );
      expect(mockOnError).toHaveBeenCalledWith('Google Play Services not available');
    });
  });

  it('shows loading state during sign-in', async () => {
    let resolveSignIn: (value: any) => void;
    const signInPromise = new Promise((resolve) => {
      resolveSignIn = resolve;
    });

    (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(true);
    (GoogleSignin.signIn as jest.Mock).mockReturnValue(signInPromise);

    const { getByTestId, queryByText } = render(
      <TestWrapper>
        <SocialLoginButton
          provider="google"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      </TestWrapper>
    );

    const button = getByTestId('social-login-button');
    fireEvent.press(button);

    // Should show loading state
    await waitFor(() => {
      expect(queryByText('Signing in...')).toBeTruthy();
    });

    // Resolve the sign-in
    resolveSignIn!({
      user: { id: '123', name: 'Test User', email: 'test@example.com' },
      idToken: 'token',
      accessToken: 'token',
    });

    // Loading should disappear
    await waitFor(() => {
      expect(queryByText('Signing in...')).toBeFalsy();
    });
  });
});