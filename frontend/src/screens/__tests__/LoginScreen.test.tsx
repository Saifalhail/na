import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from '../LoginScreen';
import { ThemeProvider } from '../../theme/ThemeContext';
import { useAuthStore } from '../../store/authStore';

// Mock the auth store
jest.mock('../../store/authStore', () => ({
  useAuthStore: jest.fn(),
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  dispatch: jest.fn(),
};

// Mock theme provider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('LoginScreen', () => {
  const mockLogin = jest.fn();
  const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      login: mockLogin,
      isLoading: false,
      user: null,
      tokens: null,
      isAuthenticated: false,
      error: null,
      register: jest.fn(),
      logout: jest.fn(),
      refreshTokens: jest.fn(),
      updateUser: jest.fn(),
      clearError: jest.fn(),
      checkAuthStatus: jest.fn(),
    });
  });

  it('renders login form correctly', () => {
    const { getByText, getByPlaceholderText } = render(
      <TestWrapper>
        <LoginScreen navigation={mockNavigation as any} />
      </TestWrapper>
    );

    expect(getByText('Welcome Back')).toBeTruthy();
    expect(getByText('Sign in to continue your nutrition journey')).toBeTruthy();
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(getByPlaceholderText('Enter your password')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
    expect(getByText('Create New Account')).toBeTruthy();
  });

  it('validates email field', async () => {
    const { getByText, getByPlaceholderText } = render(
      <TestWrapper>
        <LoginScreen navigation={mockNavigation as any} />
      </TestWrapper>
    );

    const emailInput = getByPlaceholderText('Enter your email');
    const signInButton = getByText('Sign In');

    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(getByText('Please enter a valid email address')).toBeTruthy();
    });
  });

  it('validates password field', async () => {
    const { getByText, getByPlaceholderText } = render(
      <TestWrapper>
        <LoginScreen navigation={mockNavigation as any} />
      </TestWrapper>
    );

    const emailInput = getByPlaceholderText('Enter your email');
    const signInButton = getByText('Sign In');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(getByText('Password is required')).toBeTruthy();
    });
  });

  it('calls login when form is valid', async () => {
    const { getByText, getByPlaceholderText } = render(
      <TestWrapper>
        <LoginScreen navigation={mockNavigation as any} />
      </TestWrapper>
    );

    const emailInput = getByPlaceholderText('Enter your email');
    const passwordInput = getByPlaceholderText('Enter your password');
    const signInButton = getByText('Sign In');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('shows loading state during login', () => {
    mockUseAuthStore.mockReturnValue({
      login: mockLogin,
      isLoading: true,
      user: null,
      tokens: null,
      isAuthenticated: false,
      error: null,
      register: jest.fn(),
      logout: jest.fn(),
      refreshTokens: jest.fn(),
      updateUser: jest.fn(),
      clearError: jest.fn(),
      checkAuthStatus: jest.fn(),
    });

    const { getByText } = render(
      <TestWrapper>
        <LoginScreen navigation={mockNavigation as any} />
      </TestWrapper>
    );

    expect(getByText('Logging in...')).toBeTruthy();
  });

  it('navigates to forgot password screen', () => {
    const { getByText } = render(
      <TestWrapper>
        <LoginScreen navigation={mockNavigation as any} />
      </TestWrapper>
    );

    const forgotPasswordButton = getByText('Forgot Password?');
    fireEvent.press(forgotPasswordButton);

    expect(mockNavigate).toHaveBeenCalledWith('ForgotPassword');
  });

  it('navigates to register screen', () => {
    const { getByText } = render(
      <TestWrapper>
        <LoginScreen navigation={mockNavigation as any} />
      </TestWrapper>
    );

    const registerButton = getByText('Create New Account');
    fireEvent.press(registerButton);

    expect(mockNavigate).toHaveBeenCalledWith('Register');
  });

  it('clears field errors when user types', async () => {
    const { getByText, getByPlaceholderText, queryByText } = render(
      <TestWrapper>
        <LoginScreen navigation={mockNavigation as any} />
      </TestWrapper>
    );

    const emailInput = getByPlaceholderText('Enter your email');
    const signInButton = getByText('Sign In');

    // Trigger validation error
    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(getByText('Please enter a valid email address')).toBeTruthy();
    });

    // Clear error by typing
    fireEvent.changeText(emailInput, 'test@example.com');

    await waitFor(() => {
      expect(queryByText('Please enter a valid email address')).toBeNull();
    });
  });
});
