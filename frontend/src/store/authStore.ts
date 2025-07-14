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
  reset: () => void;
  demoLogin: () => Promise<void>;
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

          // Save tokens to SecureStore
          if (response.tokens) {
            await TokenStorage.saveTokens(response.tokens);
          }

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

          // Save tokens to SecureStore
          if (response.tokens) {
            await TokenStorage.saveTokens(response.tokens);
          }

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
          if (__DEV__) {
            console.error('Logout API call failed:', error);
          }
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

          // Save new tokens to SecureStore
          if (response) {
            await TokenStorage.saveTokens(response);
          }

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

          if (!storedTokens?.access) {
            // No tokens stored - quick exit
            set({
              isAuthenticated: false,
              isLoading: false,
            });
            return;
          }

          // Check if this is a demo session (demo tokens)
          const isDemoSession = storedTokens.access === 'demo-access-token';
          
          if (isDemoSession) {
            if (__DEV__) {
              console.log('🎭 [DEMO] Found demo session tokens - clearing to show login screen');
            }
            
            // Clear demo session to show login screen
            await TokenStorage.clearTokens();
            set({
              user: null,
              tokens: null,
              isAuthenticated: false,
              isLoading: false,
            });
            return;
          }

          // For real user sessions, check if we have persisted user data first
          const { user: persistedUser } = get();
          
          if (persistedUser && persistedUser.id !== 'demo-user') {
            // We have user data - assume valid session and verify in background
            set({
              user: persistedUser,
              tokens: storedTokens,
              isAuthenticated: true,
              isLoading: false,
            });
            
            // Verify token validity in background (non-blocking)
            authApi.verifyToken()
              .then(async (isValid) => {
                if (!isValid && storedTokens.refresh) {
                  // Try to refresh silently
                  try {
                    await get().refreshTokens();
                  } catch (error) {
                    // Refresh failed, user will be logged out on next action
                    if (__DEV__) {
                      console.log('⚠️ Background token refresh failed');
                    }
                  }
                }
              })
              .catch(() => {
                // Network error - ignore, user can still use cached data
                if (__DEV__) {
                  console.log('🔄 [OFFLINE] Token verification skipped - offline mode');
                }
              });
            
            return;
          }

          // No persisted user data - we need to verify with API
          try {
            // Quick token verification
            const isValid = await authApi.verifyToken();

            if (isValid) {
              // Get current user profile only if token is valid
              const profile = await authApi.getProfile();

              set({
                user: profile.user,
                tokens: storedTokens,
                isAuthenticated: true,
                isLoading: false,
              });
            } else if (storedTokens.refresh) {
              // Token invalid, try to refresh
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
          } catch (networkError: any) {
            // Network failed - check if we can work offline
            if (networkError.message?.includes('Network')) {
              if (__DEV__) {
                console.log('🔄 [OFFLINE] Starting in offline mode');
              }
              // Clear loading state and let user continue unauthenticated
              set({
                isAuthenticated: false,
                isLoading: false,
                error: null, // Don't show error for network issues
              });
            } else {
              // Other error - clear session
              await get().logout();
            }
          }
        } catch (error) {
          if (__DEV__) {
            console.error('Auth status check failed:', error);
          }
          set({
            isAuthenticated: false,
            isLoading: false,
            error: null, // Don't block app with errors
          });
        }
      },

      // Reset store to initial state
      reset: () => {
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      // Demo login for testing/preview
      demoLogin: async () => {
        set({ isLoading: true, error: null });
        
        if (__DEV__) {
          console.log('🎭 [DEMO] Starting demo login...');
        }
        
        // Create mock session immediately for instant demo access
        try {
          const mockUser: User = {
            id: 'demo-user',
            email: 'demo@nutritionai.com',
            username: 'DemoUser',
            first_name: 'Demo',
            last_name: 'User',
            is_verified: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            account_type: 'premium', // Give demo user premium access
          };

          const mockTokens: TokenPair = {
            access: 'demo-access-token',
            refresh: 'demo-refresh-token',
            accessExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          };

          // Save mock tokens
          await TokenStorage.saveTokens(mockTokens);

          set({
            user: mockUser,
            tokens: mockTokens,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          
          if (__DEV__) {
            console.log('🎭 [DEMO] Demo session created successfully!');
            console.log('🎭 [DEMO] Demo user has premium access and full app functionality');
          }
          
          // Optionally try to sync with real demo account in background (non-blocking)
          // This won't affect the user experience as they're already logged in
          setTimeout(async () => {
            try {
              const demoCredentials = {
                email: 'demo@nutritionai.com',
                password: 'demo123456',
              };
              
              const response = await authApi.login(demoCredentials);
              
              if (response.tokens) {
                await TokenStorage.saveTokens(response.tokens);
                set({
                  user: response.user,
                  tokens: response.tokens,
                });
                
                if (__DEV__) {
                  console.log('🎭 [DEMO] Synced with real demo account');
                }
              }
            } catch (error) {
              // Silently fail - user is already using mock session
              if (__DEV__) {
                console.log('🎭 [DEMO] Background sync failed, continuing with mock session');
              }
            }
          }, 5000); // Try after 5 seconds
          
        } catch (mockError: any) {
          if (__DEV__) {
            console.error('🎭 [DEMO] Failed to create demo session:', mockError);
          }
          set({
            isLoading: false,
            error: 'Demo mode initialization failed. Please try again.',
          });
          throw mockError;
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
