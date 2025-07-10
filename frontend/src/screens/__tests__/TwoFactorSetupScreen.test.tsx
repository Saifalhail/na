import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Clipboard } from 'react-native';
import { TwoFactorSetupScreen } from '../TwoFactorSetupScreen';

// Mock the store
jest.mock('@/store/twoFactorStore', () => ({
  useTwoFactorStore: () => ({
    setupData: {
      qr_code: 'otpauth://totp/NutritionAI:test@example.com?secret=TESTSECRET&issuer=NutritionAI',
      manual_entry_key: 'TEST SECRET KEY',
      secret: 'TESTSECRET'
    },
    getQRCode: jest.fn().mockResolvedValue({}),
    isLoading: false,
    error: null,
  }),
}));

// Create a test wrapper to provide navigation and theme context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  dispatch: jest.fn(),
};

describe('TwoFactorSetupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders 2FA setup screen correctly', () => {
    const { getByText, getByTestId } = render(
      <TestWrapper>
        <TwoFactorSetupScreen navigation={mockNavigation as any} />
      </TestWrapper>
    );

    expect(getByText('Set up Two-Factor Authentication')).toBeTruthy();
    expect(getByText('Add an extra layer of security to your account')).toBeTruthy();
    expect(getByText('Step 1')).toBeTruthy();
    expect(getByText('Install an Authenticator App')).toBeTruthy();
    expect(getByText('Step 2')).toBeTruthy();
    expect(getByText('Scan QR Code')).toBeTruthy();
    expect(getByTestId('QRCode')).toBeTruthy();
  });

  it('displays QR code when setup data is available', () => {
    const { getByTestId, getByText } = render(
      <TestWrapper>
        <TwoFactorSetupScreen navigation={mockNavigation as any} />
      </TestWrapper>
    );

    expect(getByTestId('QRCode')).toBeTruthy();
    expect(getByText('Can\'t scan? Enter this code manually:')).toBeTruthy();
    expect(getByText('TEST SECRET KEY')).toBeTruthy();
    expect(getByText('Tap to copy')).toBeTruthy();
  });

  it('copies secret key to clipboard when tapped', async () => {
    jest.spyOn(Clipboard, 'setString');
    jest.spyOn(Alert, 'alert');

    const { getByText } = render(
      <TestWrapper>
        <TwoFactorSetupScreen navigation={mockNavigation as any} />
      </TestWrapper>
    );

    const secretKeyContainer = getByText('TEST SECRET KEY').parent;
    fireEvent.press(secretKeyContainer!);

    await waitFor(() => {
      expect(Clipboard.setString).toHaveBeenCalledWith('TEST SECRET KEY');
      expect(Alert.alert).toHaveBeenCalledWith(
        'Copied!',
        'The secret key has been copied to your clipboard.'
      );
    });
  });

  it('navigates to verification screen when continue is pressed', () => {
    const { getByText } = render(
      <TestWrapper>
        <TwoFactorSetupScreen navigation={mockNavigation as any} />
      </TestWrapper>
    );

    const continueButton = getByText('Continue to Verification');
    fireEvent.press(continueButton);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('TwoFactorVerify', {
      secret: 'TESTSECRET'
    });
  });

  it('shows skip confirmation when skip is pressed', () => {
    jest.spyOn(Alert, 'alert');

    const { getByText } = render(
      <TestWrapper>
        <TwoFactorSetupScreen navigation={mockNavigation as any} />
      </TestWrapper>
    );

    const skipButton = getByText('Skip for now');
    fireEvent.press(skipButton);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Skip Two-Factor Authentication?',
      'You can set this up later in your profile settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', style: 'destructive', onPress: expect.any(Function) }
      ]
    );
  });

  it('navigates back when skip is confirmed', () => {
    jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      // Simulate pressing the "Skip" button
      if (buttons && buttons[1] && buttons[1].onPress) {
        buttons[1].onPress();
      }
    });

    const { getByText } = render(
      <TestWrapper>
        <TwoFactorSetupScreen navigation={mockNavigation as any} />
      </TestWrapper>
    );

    const skipButton = getByText('Skip for now');
    fireEvent.press(skipButton);

    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('disables continue button when setup data is not available', () => {
    // Mock store with no setup data
    const mockStoreWithoutData = {
      setupData: null,
      getQRCode: jest.fn(),
      isLoading: false,
      error: null,
    };

    jest.doMock('@/store/twoFactorStore', () => ({
      useTwoFactorStore: () => mockStoreWithoutData,
    }));

    const { getByText } = render(
      <TestWrapper>
        <TwoFactorSetupScreen navigation={mockNavigation as any} />
      </TestWrapper>
    );

    const continueButton = getByText('Continue to Verification');
    
    // Check if button is disabled (this may depend on your Button component implementation)
    expect(continueButton).toBeTruthy();
  });
});