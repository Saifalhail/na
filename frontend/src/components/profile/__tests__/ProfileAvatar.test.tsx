import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { PermissionStatus } from 'expo-modules-core';
import { ProfileAvatar } from '../ProfileAvatar';
import { ThemeProvider } from '@/theme/ThemeContext';

// Mock theme hook
jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        neutral: {
          300: '#E0E0E0',
        },
        text: '#000000',
      },
    },
  }),
}));

// Mock auth store
const mockUser = {
  id: '1',
  email: 'john.doe@example.com',
  firstName: 'John',
  lastName: 'Doe',
  avatar: null as string | null,
  socialAvatarUrl: null as string | null,
};

jest.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    user: mockUser,
  }),
}));

// Mock expo-image-picker
jest.mock('expo-image-picker');
const mockedImagePicker = ImagePicker as jest.Mocked<typeof ImagePicker>;

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('ProfileAvatar', () => {
  const renderWithTheme = (component: React.ReactElement) => {
    return render(<ThemeProvider>{component}</ThemeProvider>);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset user mock
    mockUser.avatar = null;
    mockUser.socialAvatarUrl = null;
    mockUser.firstName = 'John';
    mockUser.lastName = 'Doe';
  });

  describe('Rendering', () => {
    it('renders with default size', () => {
      renderWithTheme(<ProfileAvatar />);

      const avatar = screen.getByText('JD').parent;
      expect(avatar?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: 80,
            height: 80,
            borderRadius: 40,
          }),
        ])
      );
    });

    it('renders with different sizes', () => {
      const sizes = {
        small: 50,
        medium: 80,
        large: 120,
      };

      Object.entries(sizes).forEach(([size, dimension]) => {
        const { rerender } = renderWithTheme(
          <ProfileAvatar size={size as 'small' | 'medium' | 'large'} />
        );

        const avatar = screen.getByText('JD').parent;
        expect(avatar?.props.style).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              width: dimension,
              height: dimension,
              borderRadius: dimension / 2,
            }),
          ])
        );

        rerender(<></>);
      });
    });

    it('shows initials when no avatar is set', () => {
      renderWithTheme(<ProfileAvatar />);

      expect(screen.getByText('JD')).toBeTruthy();
    });

    it('shows single initial when only first name exists', () => {
      mockUser.firstName = 'John';
      mockUser.lastName = '';

      renderWithTheme(<ProfileAvatar />);

      expect(screen.getByText('J')).toBeTruthy();
    });

    it('shows email initial when no name exists', () => {
      mockUser.firstName = '';
      mockUser.lastName = '';
      mockUser.email = 'test@example.com';

      renderWithTheme(<ProfileAvatar />);

      expect(screen.getByText('T')).toBeTruthy();
    });

    it('shows ? when no user data exists', () => {
      mockUser.firstName = '';
      mockUser.lastName = '';
      mockUser.email = '';

      renderWithTheme(<ProfileAvatar />);

      expect(screen.getByText('?')).toBeTruthy();
    });

    it('displays user avatar when available', () => {
      mockUser.avatar = 'https://example.com/avatar.jpg';

      renderWithTheme(<ProfileAvatar />);

      const image = screen.getByRole('image');
      expect(image.props.source).toEqual({ uri: 'https://example.com/avatar.jpg' });
    });

    it('prioritizes user avatar over social avatar', () => {
      mockUser.avatar = 'https://example.com/avatar.jpg';
      mockUser.socialAvatarUrl = 'https://example.com/social.jpg';

      renderWithTheme(<ProfileAvatar />);

      const image = screen.getByRole('image');
      expect(image.props.source).toEqual({ uri: 'https://example.com/avatar.jpg' });
    });

    it('uses social avatar when no user avatar exists', () => {
      mockUser.avatar = null;
      mockUser.socialAvatarUrl = 'https://example.com/social.jpg';

      renderWithTheme(<ProfileAvatar />);

      const image = screen.getByRole('image');
      expect(image.props.source).toEqual({ uri: 'https://example.com/social.jpg' });
    });

    it('shows edit overlay when editable', () => {
      renderWithTheme(<ProfileAvatar editable />);

      expect(screen.getByText('Edit')).toBeTruthy();
    });

    it('does not show edit overlay when not editable', () => {
      renderWithTheme(<ProfileAvatar />);

      expect(screen.queryByText('Edit')).toBeNull();
    });
  });

  describe('Interactions', () => {
    it('does not respond to press when not editable', () => {
      renderWithTheme(<ProfileAvatar />);

      const avatar = screen.getByText('JD').parent?.parent;
      fireEvent.press(avatar!);

      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('shows options alert when pressed and editable', () => {
      renderWithTheme(<ProfileAvatar editable />);

      const avatar = screen.getByText('JD').parent?.parent;
      fireEvent.press(avatar!);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Change Profile Picture',
        'Choose how you would like to update your profile picture',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Camera' }),
          expect.objectContaining({ text: 'Photo Library' }),
          expect.objectContaining({ text: 'Use Social Avatar' }),
          expect.objectContaining({ text: 'Cancel' }),
        ])
      );
    });

    it('handles camera selection', async () => {
      const onImageSelect = jest.fn();
      mockedImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: PermissionStatus.GRANTED,
        granted: true,
        canAskAgain: true,
        expires: 'never',
      });
      mockedImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [
          {
            uri: 'file://camera-photo.jpg',
            width: 100,
            height: 100,
            type: 'image',
            fileName: 'photo.jpg',
            fileSize: 1000,
            base64: null,
            exif: null,
            duration: null,
            mimeType: 'image/jpeg',
            assetId: '1',
          },
        ],
      });

      renderWithTheme(<ProfileAvatar editable onImageSelect={onImageSelect} />);

      const avatar = screen.getByText('JD').parent?.parent;
      fireEvent.press(avatar!);

      // Get camera option from alert
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const cameraOption = alertCall[2].find((opt: any) => opt.text === 'Camera');
      await cameraOption.onPress();

      await waitFor(() => {
        expect(mockedImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled();
        expect(mockedImagePicker.launchCameraAsync).toHaveBeenCalledWith({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
        expect(onImageSelect).toHaveBeenCalledWith('file://camera-photo.jpg');
      });
    });

    it('handles photo library selection', async () => {
      const onImageSelect = jest.fn();
      mockedImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
        status: PermissionStatus.GRANTED,
        granted: true,
        canAskAgain: true,
        expires: 'never',
      });
      mockedImagePicker.launchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [
          {
            uri: 'file://library-photo.jpg',
            width: 100,
            height: 100,
            type: 'image',
            fileName: 'photo.jpg',
            fileSize: 1000,
            base64: null,
            exif: null,
            duration: null,
            mimeType: 'image/jpeg',
            assetId: '1',
          },
        ],
      });

      renderWithTheme(<ProfileAvatar editable onImageSelect={onImageSelect} />);

      const avatar = screen.getByText('JD').parent?.parent;
      fireEvent.press(avatar!);

      // Get library option from alert
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const libraryOption = alertCall[2].find((opt: any) => opt.text === 'Photo Library');
      await libraryOption.onPress();

      await waitFor(() => {
        expect(mockedImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled();
        expect(mockedImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
        expect(onImageSelect).toHaveBeenCalledWith('file://library-photo.jpg');
      });
    });

    it('handles permission denial', async () => {
      mockedImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: PermissionStatus.DENIED,
        granted: false,
        canAskAgain: true,
        expires: 'never',
      });

      renderWithTheme(<ProfileAvatar editable />);

      const avatar = screen.getByText('JD').parent?.parent;
      fireEvent.press(avatar!);

      // Get camera option from alert
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const cameraOption = alertCall[2].find((opt: any) => opt.text === 'Camera');
      await cameraOption.onPress();

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Permission required',
          'Camera permission is required to take photos.'
        );
        expect(mockedImagePicker.launchCameraAsync).not.toHaveBeenCalled();
      });
    });

    it('handles social avatar selection', async () => {
      const onImageSelect = jest.fn();
      mockUser.socialAvatarUrl = 'https://example.com/social.jpg';

      renderWithTheme(<ProfileAvatar editable onImageSelect={onImageSelect} />);

      const avatar = screen.getByText('JD').parent?.parent;
      fireEvent.press(avatar!);

      // Get social avatar option from alert
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const socialOption = alertCall[2].find((opt: any) => opt.text === 'Use Social Avatar');
      socialOption.onPress();

      expect(onImageSelect).toHaveBeenCalledWith('https://example.com/social.jpg');
    });

    it('disables social avatar option when not available', () => {
      mockUser.socialAvatarUrl = null;

      renderWithTheme(<ProfileAvatar editable />);

      const avatar = screen.getByText('JD').parent?.parent;
      fireEvent.press(avatar!);

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const socialOption = alertCall[2].find((opt: any) => opt.text === 'Use Social Avatar');
      expect(socialOption.style).toBe('cancel');
    });

    it('handles image picker errors', async () => {
      mockedImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: PermissionStatus.GRANTED,
        granted: true,
        canAskAgain: true,
        expires: 'never',
      });
      mockedImagePicker.launchCameraAsync.mockRejectedValue(new Error('Camera error'));

      renderWithTheme(<ProfileAvatar editable />);

      const avatar = screen.getByText('JD').parent?.parent;
      fireEvent.press(avatar!);

      // Get camera option from alert
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const cameraOption = alertCall[2].find((opt: any) => opt.text === 'Camera');
      await cameraOption.onPress();

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to select image. Please try again.'
        );
      });
    });

    it('ignores canceled image selection', async () => {
      const onImageSelect = jest.fn();
      mockedImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: PermissionStatus.GRANTED,
        granted: true,
        canAskAgain: true,
        expires: 'never',
      });
      mockedImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: true,
        assets: null,
      });

      renderWithTheme(<ProfileAvatar editable onImageSelect={onImageSelect} />);

      const avatar = screen.getByText('JD').parent?.parent;
      fireEvent.press(avatar!);

      // Get camera option from alert
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const cameraOption = alertCall[2].find((opt: any) => opt.text === 'Camera');
      await cameraOption.onPress();

      await waitFor(() => {
        expect(onImageSelect).not.toHaveBeenCalled();
      });
    });
  });
});
