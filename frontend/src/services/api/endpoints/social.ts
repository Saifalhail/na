import { api } from '../client';
import { API_ENDPOINTS } from '../config';
import { TokenStorage } from '@services/storage/tokenStorage';
import {
  GoogleLoginRequest,
  SocialAuthResponse,
  SocialAccountInfo,
  SocialLinkRequest,
} from '@types/api';

export const socialApi = {
  /**
   * Login with Google OAuth2
   */
  async loginWithGoogle(data: GoogleLoginRequest): Promise<SocialAuthResponse> {
    const response = await api.post<SocialAuthResponse>(API_ENDPOINTS.social.google, data);
    
    // Save tokens if login successful
    if (response.tokens) {
      await TokenStorage.saveTokens(response.tokens);
    }
    
    return response;
  },

  /**
   * Login with Apple (future implementation)
   */
  async loginWithApple(data: any): Promise<SocialAuthResponse> {
    const response = await api.post<SocialAuthResponse>(API_ENDPOINTS.social.apple, data);
    
    // Save tokens if login successful
    if (response.tokens) {
      await TokenStorage.saveTokens(response.tokens);
    }
    
    return response;
  },

  /**
   * Get connected social accounts
   */
  async getConnectedAccounts(): Promise<SocialAccountInfo[]> {
    return await api.get<SocialAccountInfo[]>('/auth/social/accounts/');
  },

  /**
   * Link social account to existing user
   */
  async linkAccount(provider: string, data: SocialLinkRequest): Promise<SocialAccountInfo> {
    return await api.post<SocialAccountInfo>(`/auth/social/${provider}/link/`, data);
  },

  /**
   * Unlink social account
   */
  async unlinkAccount(provider: string, accountId: string): Promise<void> {
    await api.delete(`/auth/social/${provider}/unlink/${accountId}/`);
  },

  /**
   * Get social account avatar URL
   */
  async getSocialAvatar(provider: string): Promise<{ avatar_url: string }> {
    return await api.get<{ avatar_url: string }>(`/auth/social/${provider}/avatar/`);
  },

  /**
   * Sync social profile information
   */
  async syncSocialProfile(provider: string): Promise<SocialAccountInfo> {
    return await api.post<SocialAccountInfo>(`/auth/social/${provider}/sync/`);
  },
};