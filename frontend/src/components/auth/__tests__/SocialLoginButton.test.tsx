import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { SocialLoginButton } from '../SocialLoginButton';

// Mock expo modules
jest.mock('expo-auth-session');
jest.mock('expo-web-browser');

// Mock stores
jest.mock('@/store/twoFactorStore', () => ({
  useTwoFactorStore: () => ({
    loginWithGoogle: jest.fn().mockResolvedValue({ user: { id: '123', name: 'Test User' } }),
    isSocialLoading: false,
  }),
}));

jest.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    updateUser: jest.fn(),
  }),
}));

// Mock env config
jest.mock('@/config/env', () => ({
  googleOAuthClientId: 'test-client-id',
}));

// Create a test wrapper to provide theme context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

describe('SocialLoginButton', () => {
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();
  const mockPromptAsync = jest.fn();
  const mockRequest = {};

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock WebBrowser
    (WebBrowser.maybeCompleteAuthSession as jest.Mock).mockReturnValue(undefined);
    
    // Mock AuthSession hooks
    (AuthSession.useAutoDiscovery as jest.Mock).mockReturnValue({});
    (AuthSession.makeRedirectUri as jest.Mock).mockReturnValue('exp://localhost:8081');
    (AuthSession.useAuthRequest as jest.Mock).mockReturnValue([
      mockRequest,
      null,
      mockPromptAsync,
    ]);
  });

  it('renders Google sign-in button correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <SocialLoginButton provider="google" onSuccess={mockOnSuccess} onError={mockOnError} />
      </TestWrapper>
    );

    expect(getByText('Continue with Google')).toBeTruthy();
  });

  it('calls Google sign-in when pressed', async () => {
    const mockResponse = {
      type: 'success',
      authentication: {
        accessToken: 'mock-access-token',
        idToken: 'mock-id-token',
      },
    };

    mockPromptAsync.mockResolvedValue(mockResponse);
    
    // Mock successful auth flow
    (AuthSession.useAuthRequest as jest.Mock).mockReturnValue([
      mockRequest,
      mockResponse,
      mockPromptAsync,
    ]);

    // Mock fetch for user info
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
      }),
    });

    const { getByText } = render(
      <TestWrapper>
        <SocialLoginButton provider="google" onSuccess={mockOnSuccess} onError={mockOnError} />
      </TestWrapper>
    );

    const button = getByText('Continue with Google');
    fireEvent.press(button);

    await waitFor(() => {
      expect(mockPromptAsync).toHaveBeenCalled();
    });
  });

  it('handles Google sign-in cancellation', async () => {
    const mockResponse = {
      type: 'cancel',
    };

    (AuthSession.useAuthRequest as jest.Mock).mockReturnValue([
      mockRequest,
      mockResponse,
      mockPromptAsync,
    ]);

    const { getByText } = render(
      <TestWrapper>
        <SocialLoginButton provider="google" onSuccess={mockOnSuccess} onError={mockOnError} />
      </TestWrapper>
    );

    // The component should handle the cancellation through useEffect
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Google sign-in was cancelled');
    });
  });

  it('handles Google sign-in errors', async () => {
    const mockResponse = {
      type: 'error',
      error: { message: 'Something went wrong' },
    };

    (AuthSession.useAuthRequest as jest.Mock).mockReturnValue([
      mockRequest,
      mockResponse,
      mockPromptAsync,
    ]);

    jest.spyOn(Alert, 'alert');

    const { getByText } = render(
      <TestWrapper>
        <SocialLoginButton provider="google" onSuccess={mockOnSuccess} onError={mockOnError} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Login Failed',
        'Something went wrong'
      );
      expect(mockOnError).toHaveBeenCalledWith('Something went wrong');
    });
  });

  it('handles missing Google client ID', async () => {
    // Mock missing client ID
    jest.doMock('@/config/env', () => ({
      googleOAuthClientId: '',
    }));

    jest.spyOn(Alert, 'alert');

    const { getByText } = render(
      <TestWrapper>
        <SocialLoginButton provider="google" onSuccess={mockOnSuccess} onError={mockOnError} />
      </TestWrapper>
    );

    const button = getByText('Continue with Google');
    fireEvent.press(button);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Configuration Error',
        'Google OAuth client ID is not configured. Please check your environment settings.'
      );
    });
  });

  it('shows loading state when social loading', async () => {
    // Mock loading state
    jest.doMock('@/store/twoFactorStore', () => ({
      useTwoFactorStore: () => ({
        loginWithGoogle: jest.fn(),
        isSocialLoading: true,
      }),
    }));

    const { getByText } = render(
      <TestWrapper>
        <SocialLoginButton provider="google" onSuccess={mockOnSuccess} onError={mockOnError} />
      </TestWrapper>
    );

    expect(getByText('Loading...')).toBeTruthy();
  });
});
