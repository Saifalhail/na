import { create } from 'zustand';
import { twoFactorApi, socialApi } from '@/services/api';
import type {
  TwoFactorSetupRequest,
  TwoFactorSetupResponse,
  TwoFactorVerifyRequest,
  TwoFactorBackupCodesResponse,
  GoogleLoginRequest,
  SocialAuthResponse,
} from '@/types/api';

interface TwoFactorState {
  // 2FA Setup State
  setupData: TwoFactorSetupResponse | null;
  backupCodes: string[];
  codesRemaining: number;
  isLoading: boolean;
  error: string | null;

  // Login State
  requiresTwoFactor: boolean;
  sessionToken: string | null;
  isVerifying: boolean;

  // Social Auth State
  isSocialLoading: boolean;
  socialError: string | null;

  // Actions - 2FA Management
  setup2FA: (data: TwoFactorSetupRequest) => Promise<TwoFactorSetupResponse>;
  setupTwoFactor: () => Promise<void>;
  verifySetup: (code: string) => Promise<{ success: boolean }>;
  disable2FA: (password: string) => Promise<void>;
  getQRCode: () => Promise<{ qr_code: string; manual_entry_key: string }>;

  // Actions - 2FA Verification
  verify2FA: (data: TwoFactorVerifyRequest) => Promise<any>;
  verifyBackupCode: (backupCode: string) => Promise<any>;

  // Actions - Backup Codes
  getBackupCodes: () => Promise<void>;
  generateNewBackupCodes: (password: string) => Promise<void>;
  generateBackupCodes: () => Promise<string[]>;

  // Actions - Social Authentication
  loginWithGoogle: (data: GoogleLoginRequest) => Promise<SocialAuthResponse>;

  // Utility
  clearError: () => void;
  clearSocialError: () => void;
  reset: () => void;
  setRequiresTwoFactor: (sessionToken: string) => void;
}

const initialState = {
  setupData: null,
  backupCodes: [],
  codesRemaining: 0,
  isLoading: false,
  error: null,
  requiresTwoFactor: false,
  sessionToken: null,
  isVerifying: false,
  isSocialLoading: false,
  socialError: null,
};

export const useTwoFactorStore = create<TwoFactorState>((set, get) => ({
  ...initialState,

  // Setup 2FA with data
  setup2FA: async (data: TwoFactorSetupRequest) => {
    set({ isLoading: true, error: null });

    try {
      const response = await twoFactorApi.setup(data);

      set({
        setupData: response,
        backupCodes: response.backup_codes || [],
        isLoading: false,
        error: null,
      });

      return response;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to setup 2FA',
      });
      throw error;
    }
  },

  // Setup 2FA (auto-setup for new users)
  setupTwoFactor: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await twoFactorApi.setup({
        device_name: 'Authenticator App',
      });

      set({
        setupData: response,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to setup 2FA',
      });
      throw error;
    }
  },

  // Verify setup with TOTP code
  verifySetup: async (code: string) => {
    set({ isVerifying: true, error: null });

    try {
      const setupData = get().setupData;
      if (!setupData?.device_id) {
        throw new Error('No device ID available for verification');
      }

      const response = await twoFactorApi.verify({
        device_id: setupData.device_id,
        totp_code: code,
      });

      set({
        isVerifying: false,
        error: null,
        backupCodes: response.backup_codes || [],
      });

      return { success: true };
    } catch (error: any) {
      set({
        isVerifying: false,
        error: error.message || 'Invalid verification code',
      });
      throw error;
    }
  },

  // Disable 2FA
  disable2FA: async (password: string) => {
    set({ isLoading: true, error: null });

    try {
      await twoFactorApi.disable(password);

      set({
        setupData: null,
        backupCodes: [],
        codesRemaining: 0,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to disable 2FA',
      });
      throw error;
    }
  },

  // Get QR code for setup
  getQRCode: async () => {
    set({ isLoading: true, error: null });

    try {
      // First, enable 2FA to get a device ID
      const setupResponse = await twoFactorApi.setup({
        device_name: 'Authenticator App',
      });

      // Then get the QR code using the device ID
      const qrResponse = await twoFactorApi.getQRCode(setupResponse.device_id);

      const combinedResponse = {
        ...setupResponse,
        ...qrResponse,
        manual_entry_key: qrResponse.secret,
      };

      set({
        setupData: combinedResponse,
        isLoading: false,
        error: null,
      });

      return combinedResponse;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to get QR code',
      });
      throw error;
    }
  },

  // Verify 2FA during login
  verify2FA: async (data: TwoFactorVerifyRequest) => {
    set({ isVerifying: true, error: null });

    try {
      const response = await twoFactorApi.verify({
        ...data,
        session_token: get().sessionToken || undefined,
      });

      set({
        isVerifying: false,
        requiresTwoFactor: false,
        sessionToken: null,
        error: null,
      });

      return response;
    } catch (error: any) {
      set({
        isVerifying: false,
        error: error.message || 'Invalid verification code',
      });
      throw error;
    }
  },

  // Verify backup code
  verifyBackupCode: async (backupCode: string) => {
    set({ isVerifying: true, error: null });

    try {
      const response = await twoFactorApi.verifyBackupCode(backupCode);

      set({
        isVerifying: false,
        requiresTwoFactor: false,
        sessionToken: null,
        codesRemaining: Math.max(0, get().codesRemaining - 1),
        error: null,
      });

      return response;
    } catch (error: any) {
      set({
        isVerifying: false,
        error: error.message || 'Invalid backup code',
      });
      throw error;
    }
  },

  // Get backup codes
  getBackupCodes: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await twoFactorApi.getBackupCodes();

      set({
        codesRemaining: response.count,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to get backup codes',
      });
      throw error;
    }
  },

  // Generate new backup codes
  generateNewBackupCodes: async (password: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await twoFactorApi.generateBackupCodes(password);

      set({
        backupCodes: response.backup_codes || [],
        codesRemaining: response.backup_codes?.length || 0,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to generate new backup codes',
      });
      throw error;
    }
  },

  // Generate backup codes (used after verification)
  generateBackupCodes: async () => {
    try {
      // Note: This is typically called after successful verification
      // The backup codes are returned from the verify endpoint
      const backupCodes = get().backupCodes;

      if (backupCodes.length === 0) {
        throw new Error('No backup codes available. Please complete 2FA setup first.');
      }

      return backupCodes;
    } catch (error: any) {
      set({
        error: error.message || 'Failed to get backup codes',
      });
      throw error;
    }
  },

  // Google Social Login
  loginWithGoogle: async (data: GoogleLoginRequest) => {
    set({ isSocialLoading: true, socialError: null });

    try {
      const response = await socialApi.loginWithGoogle(data);

      set({
        isSocialLoading: false,
        socialError: null,
      });

      return response;
    } catch (error: any) {
      set({
        isSocialLoading: false,
        socialError: error.message || 'Google login failed',
      });
      throw error;
    }
  },

  // Set 2FA requirement (called from auth flow)
  setRequiresTwoFactor: (sessionToken: string) => {
    set({
      requiresTwoFactor: true,
      sessionToken,
    });
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Clear social error
  clearSocialError: () => set({ socialError: null }),

  // Reset store
  reset: () => set(initialState),
}));
