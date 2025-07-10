import { api } from '../client';
import { API_ENDPOINTS } from '../config';
import {
  TwoFactorSetupRequest,
  TwoFactorSetupResponse,
  TwoFactorVerifyRequest,
  TwoFactorVerifyResponse,
  TwoFactorQRCodeResponse,
  TwoFactorBackupCodesResponse,
} from '@/types/api';

export const twoFactorApi = {
  /**
   * Get 2FA status
   */
  async getStatus(): Promise<any> {
    return await api.get(API_ENDPOINTS.twoFactor.status);
  },

  /**
   * Setup/Enable two-factor authentication
   */
  async setup(data: TwoFactorSetupRequest): Promise<TwoFactorSetupResponse> {
    return await api.post<TwoFactorSetupResponse>(API_ENDPOINTS.twoFactor.setup, data);
  },

  /**
   * Get QR code for TOTP setup
   */
  async getQRCode(deviceId: number): Promise<TwoFactorQRCodeResponse> {
    return await api.post<TwoFactorQRCodeResponse>(API_ENDPOINTS.twoFactor.qrCode, {
      device_id: deviceId,
    });
  },

  /**
   * Verify TOTP code during setup
   */
  async verify(data: TwoFactorVerifyRequest): Promise<TwoFactorVerifyResponse> {
    return await api.post<TwoFactorVerifyResponse>(API_ENDPOINTS.twoFactor.verify, data);
  },

  /**
   * Complete 2FA login after verification
   */
  async complete(data: any): Promise<any> {
    return await api.post(API_ENDPOINTS.twoFactor.complete, data);
  },

  /**
   * Disable two-factor authentication
   */
  async disable(password: string): Promise<void> {
    await api.post(API_ENDPOINTS.twoFactor.disable, { password });
  },

  /**
   * Get backup codes count
   */
  async getBackupCodes(): Promise<TwoFactorBackupCodesResponse> {
    return await api.get<TwoFactorBackupCodesResponse>(API_ENDPOINTS.twoFactor.backupCodes);
  },

  /**
   * Generate new backup codes
   */
  async generateBackupCodes(password: string): Promise<TwoFactorBackupCodesResponse> {
    return await api.post<TwoFactorBackupCodesResponse>(API_ENDPOINTS.twoFactor.generateBackupCodes, {
      password,
    });
  },

  /**
   * Verify backup code
   */
  async verifyBackupCode(backupCode: string): Promise<TwoFactorVerifyResponse> {
    return await api.post<TwoFactorVerifyResponse>(API_ENDPOINTS.twoFactor.verify, {
      backup_code: backupCode,
    });
  },
};