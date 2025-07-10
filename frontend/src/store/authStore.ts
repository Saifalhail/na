import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from './persist';
import { authApi } from '@services/api';
import { TokenStorage } from '@services/storage/tokenStorage';
import type { User } from '@/types/models';
import type { TokenPair, LoginCredentials, RegisterData } from '@/types/api';

interface AuthState {
  // State
  user: User | null;
  tokens: TokenPair | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  clearError: () => void;
  checkAuthStatus: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Login action
      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(credentials);

          set({
            user: response.user,
            tokens: response.tokens,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Login failed',
            isAuthenticated: false,
          });
          throw error;
        }
      },

      // Register action
      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register(data);

          set({
            user: response.user,
            tokens: response.tokens,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Registration failed',
            isAuthenticated: false,
          });
          throw error;
        }
      },

      // Logout action
      logout: async () => {
        set({ isLoading: true });
        try {
          await authApi.logout();
        } catch (error) {
          // Continue with logout even if API call fails
          console.error('Logout API call failed:', error);
        }

        // Clear tokens from storage
        await TokenStorage.clearTokens();

        // Reset state
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      // Refresh tokens
      refreshTokens: async () => {
        const { tokens } = get();
        if (!tokens?.refresh) {
          throw new Error('No refresh token available');
        }

        try {
          const response = await authApi.refreshToken(tokens.refresh);

          set({
            tokens: response,
            error: null,
          });
        } catch (error: any) {
          // If refresh fails, logout user
          await get().logout();
          throw error;
        }
      },

      // Update user
      updateUser: (userData: Partial<User>) => {
        const { user } = get();
        if (user) {
          set({
            user: { ...user, ...userData },
          });
        }
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Check auth status on app start
      checkAuthStatus: async () => {
        set({ isLoading: true });
        try {
          // Check if we have stored tokens
          const storedTokens = await TokenStorage.getTokens();

          if (storedTokens?.access) {
            // Verify token is still valid
            const isValid = await authApi.verifyToken();

            if (isValid) {
              // Get current user profile
              const profile = await authApi.getProfile();

              set({
                user: profile.user,
                tokens: storedTokens,
                isAuthenticated: true,
                isLoading: false,
              });
            } else {
              // Token invalid, try to refresh
              if (storedTokens.refresh) {
                await get().refreshTokens();
                const profile = await authApi.getProfile();

                set({
                  user: profile.user,
                  isAuthenticated: true,
                  isLoading: false,
                });
              } else {
                // No valid tokens, logout
                await get().logout();
              }
            }
          } else {
            // No tokens stored
            set({
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } catch (error) {
          console.error('Auth status check failed:', error);
          set({
            isAuthenticated: false,
            isLoading: false,
            error: 'Failed to restore session',
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
