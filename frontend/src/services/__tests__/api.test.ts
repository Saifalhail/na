import { authApi } from '../api/endpoints/auth';
import { TokenStorage } from '../storage/tokenStorage';
import { api } from '../api/client';

// Mock the API client
jest.mock('../api/client', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  },
}));

// Mock TokenStorage
jest.mock('../storage/tokenStorage', () => ({
  TokenStorage: {
    saveTokens: jest.fn(),
    getAccessToken: jest.fn(),
    getRefreshToken: jest.fn(),
    clearTokens: jest.fn(),
    isTokenExpired: jest.fn(),
    hasValidTokens: jest.fn(),
    getTokens: jest.fn(),
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authApi', () => {
    it('calls login endpoint correctly', async () => {
      const mockResponse = {
        user: { id: '1', email: 'test@example.com' },
        tokens: { access: 'access-token', refresh: 'refresh-token' },
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = await authApi.login(credentials);

      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/auth/login/', credentials);
      expect(result).toEqual(mockResponse);
      expect(TokenStorage.saveTokens).toHaveBeenCalledWith(mockResponse.tokens);
    });

    it('calls register endpoint correctly', async () => {
      const mockResponse = {
        user: { id: '1', email: 'test@example.com' },
        tokens: { access: 'access-token', refresh: 'refresh-token' },
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const registerData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        passwordConfirm: 'password123',
        termsAccepted: true,
      };

      const result = await authApi.register(registerData);

      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/auth/register/', registerData);
      expect(result).toEqual(mockResponse);
      expect(TokenStorage.saveTokens).toHaveBeenCalledWith(mockResponse.tokens);
    });

    it('calls logout endpoint correctly', async () => {
      const mockRefreshToken = 'refresh-token';
      (TokenStorage.getRefreshToken as jest.Mock).mockResolvedValue(mockRefreshToken);

      mockApi.post.mockResolvedValue(undefined);

      await authApi.logout();

      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/auth/logout/', {
        refresh: mockRefreshToken,
      });
      expect(TokenStorage.clearTokens).toHaveBeenCalled();
    });

    it('refreshes tokens correctly', async () => {
      const mockRefreshToken = 'refresh-token';
      const mockNewTokens = {
        access: 'new-access-token',
        refresh: 'new-refresh-token',
      };

      mockApi.post.mockResolvedValue(mockNewTokens);

      const result = await authApi.refreshToken(mockRefreshToken);

      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/auth/refresh/', {
        refresh: mockRefreshToken,
      });
      expect(result).toEqual(mockNewTokens);
      expect(TokenStorage.saveTokens).toHaveBeenCalledWith(mockNewTokens);
    });

    it('gets user profile correctly', async () => {
      const mockProfile = {
        user: { id: '1', email: 'test@example.com' },
        bio: 'Test bio',
      };

      mockApi.get.mockResolvedValue(mockProfile);

      const result = await authApi.getProfile();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/auth/profile/');
      expect(result).toEqual(mockProfile);
    });

    it('handles API errors correctly', async () => {
      const errorResponse = new Error('Bad Request');

      mockApi.post.mockRejectedValue(errorResponse);

      await expect(
        authApi.login({
          email: 'test@example.com',
          password: 'wrong-password',
        })
      ).rejects.toThrow('Bad Request');
    });
  });
});
