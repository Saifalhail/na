import { api } from '../client';
import { API_ENDPOINTS } from '../config';
import { TokenStorage } from '@services/storage/tokenStorage';
import {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  TokenPair,
  PasswordResetRequest,
  PasswordResetConfirm,
  PasswordChange,
  EmailVerification,
  UpdateProfileData,
} from '@/types/api';
import { UserProfile } from '@/types/models';

export const authApi = {
  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(API_ENDPOINTS.auth.register, data);

    // Save tokens
    await TokenStorage.saveTokens(response.tokens);

    return response;
  },

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(API_ENDPOINTS.auth.login, credentials);

    // Save tokens
    await TokenStorage.saveTokens(response.tokens);

    return response;
  },

  /**
   * Logout and invalidate tokens
   */
  async logout(): Promise<void> {
    try {
      const refreshToken = await TokenStorage.getRefreshToken();

      if (refreshToken) {
        await api.post(API_ENDPOINTS.auth.logout, { refresh: refreshToken });
      }
    } catch (error) {
      // Ignore errors during logout
      console.error('Logout error:', error);
    } finally {
      // Always clear tokens
      await TokenStorage.clearTokens();
    }
  },

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    const response = await api.post<TokenPair>(API_ENDPOINTS.auth.refresh, {
      refresh: refreshToken,
    });

    // Save new tokens
    await TokenStorage.saveTokens(response);

    return response;
  },

  /**
   * Verify if token is valid
   */
  async verifyToken(): Promise<boolean> {
    try {
      await api.post(API_ENDPOINTS.auth.verify);
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Verify email address
   */
  async verifyEmail(data: EmailVerification): Promise<void> {
    await api.post(API_ENDPOINTS.auth.verifyEmail, data);
  },

  /**
   * Request password reset
   */
  async requestPasswordReset(data: PasswordResetRequest): Promise<void> {
    await api.post(API_ENDPOINTS.auth.passwordReset, data);
  },

  /**
   * Confirm password reset with token
   */
  async confirmPasswordReset(data: PasswordResetConfirm): Promise<void> {
    await api.post(API_ENDPOINTS.auth.passwordResetConfirm, data);
  },

  /**
   * Change password (authenticated)
   */
  async changePassword(data: PasswordChange): Promise<void> {
    await api.post(API_ENDPOINTS.auth.passwordChange, data);
  },

  /**
   * Get user profile
   */
  async getProfile(): Promise<UserProfile> {
    return await api.get<UserProfile>(API_ENDPOINTS.auth.profile);
  },

  /**
   * Update user profile
   */
  async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
    return await api.put<UserProfile>(API_ENDPOINTS.auth.profile, data);
  },

  /**
   * Upload profile avatar
   */
  async uploadAvatar(imageUri: string): Promise<UserProfile> {
    const formData = new FormData();
    formData.append('avatar', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'avatar.jpg',
    } as any);

    return await api.patch<UserProfile>(API_ENDPOINTS.auth.profile, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Delete user account
   */
  async deleteAccount(password: string): Promise<void> {
    await api.delete(API_ENDPOINTS.auth.profile, {
      data: { password },
    });

    // Clear tokens after account deletion
    await TokenStorage.clearTokens();
  },
};
