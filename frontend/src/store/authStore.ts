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

          if (storedTokens?.access) {
            // Check if this is a demo session (demo tokens)
            const isDemoSession = storedTokens.access === 'demo-access-token';
            
            if (isDemoSession) {
              if (__DEV__) {
                console.log('🎭 [DEMO] Restoring demo session...');
              }
              
              // For demo sessions, restore from stored state without API calls
              const { user } = get();
              if (user && user.id === 'demo-user') {
                set({
                  user,
                  tokens: storedTokens,
                  isAuthenticated: true,
                  isLoading: false,
                });
                if (__DEV__) {
                  console.log('🎭 [DEMO] Demo session restored successfully');
                }
                return;
              } else {
                // Demo tokens but no user - recreate demo session
                if (__DEV__) {
                  console.log('🎭 [DEMO] Demo tokens found but no user data, recreating...');
                }
                await get().demoLogin();
                return;
              }
            }

            // For real user sessions, verify with API
            try {
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
            } catch (networkError) {
              if (__DEV__) {
                console.error('Network error during auth check:', networkError);
              }
              // If network fails, try to maintain existing session if user data is available
              const { user } = get();
              if (user && storedTokens) {
                if (__DEV__) {
                  console.log('🔄 [OFFLINE] Maintaining offline session due to network error');
                }
                set({
                  user,
                  tokens: storedTokens,
                  isAuthenticated: true,
                  isLoading: false,
                  error: 'Working offline - some features may be limited',
                });
              } else {
                // No user data available, logout
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
          if (__DEV__) {
            console.error('Auth status check failed:', error);
          }
          set({
            isAuthenticated: false,
            isLoading: false,
            error: 'Failed to restore session',
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
        
        // First, test if the API is even reachable
        let useOfflineMode = false;
        try {
          // Quick connectivity test with short timeout
          const connectivityTest = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/v1/health/`, {
            method: 'GET',
            timeout: 3000,
          });
          
          if (!connectivityTest.ok) {
            useOfflineMode = true;
            if (__DEV__) {
              console.log('🎭 [DEMO] API not reachable, using offline mode');
            }
          }
        } catch (connectivityError) {
          useOfflineMode = true;
          if (__DEV__) {
            console.log('🎭 [DEMO] Network error detected, using offline mode:', connectivityError.message);
          }
        }

        // If API is not reachable, skip trying the real login and go straight to mock
        if (useOfflineMode) {
          if (__DEV__) {
            console.log('🎭 [DEMO] Creating offline demo session...');
          }
        } else {
          try {
            // Try real demo account login
            if (__DEV__) {
              console.log('🎭 [DEMO] Attempting real demo account login...');
            }
            const demoCredentials = {
              email: 'demo@nutritionai.com',
              password: 'demo123456',
            };

            const response = await authApi.login(demoCredentials);

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
            
            if (__DEV__) {
              console.log('🎭 [DEMO] Real demo login successful!');
            }
            return; // Exit early on success
          } catch (error: any) {
            if (__DEV__) {
              console.log('🎭 [DEMO] Real demo login failed, falling back to offline mode:', error.message);
            }
          }
        }

        // Create mock session (offline mode or fallback)
        try {
          if (__DEV__) {
            console.log('🎭 [DEMO] Creating mock demo session...');
          }
          
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
            console.log('🎭 [DEMO] Mock demo session created successfully!');
            console.log('🎭 [DEMO] Demo user has premium access and full app functionality');
          }
        } catch (mockError: any) {
          if (__DEV__) {
            console.error('🎭 [DEMO] Failed to create mock session:', mockError);
          }
          set({
            isLoading: false,
            error: 'Demo mode initialization failed. Please try again.',
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
