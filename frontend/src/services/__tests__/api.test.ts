import axios from 'axios';
import { authApi } from '../api/endpoints/auth';
import { TokenStorage } from '../storage/tokenStorage';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
  defaults: {
    headers: {
      common: {},
    },
  },
};

// Mock axios.create to return our mock instance
mockedAxios.create = jest.fn(() => mockAxiosInstance);

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
      
      mockAxiosInstance.post.mockResolvedValue({
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = await authApi.login(credentials);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/login/', credentials);
      expect(result).toEqual(mockResponse);
      expect(TokenStorage.saveTokens).toHaveBeenCalledWith(mockResponse.tokens);
    });

    it('calls register endpoint correctly', async () => {
      const mockResponse = {
        user: { id: '1', email: 'test@example.com' },
        tokens: { access: 'access-token', refresh: 'refresh-token' },
      };
      
      mockAxiosInstance.post.mockResolvedValue({
        data: mockResponse,
        status: 201,
        statusText: 'Created',
        headers: {},
      });

      const registerData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const result = await authApi.register(registerData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/register/', registerData);
      expect(result).toEqual(mockResponse);
      expect(TokenStorage.saveTokens).toHaveBeenCalledWith(mockResponse.tokens);
    });

    it('calls logout endpoint correctly', async () => {
      const mockRefreshToken = 'refresh-token';
      (TokenStorage.getRefreshToken as jest.Mock).mockResolvedValue(mockRefreshToken);

      mockAxiosInstance.post.mockResolvedValue({
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      await authApi.logout();

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/logout/', {
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

      mockAxiosInstance.post.mockResolvedValue({
        data: mockNewTokens,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await authApi.refreshToken(mockRefreshToken);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/refresh/', {
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

      mockAxiosInstance.get.mockResolvedValue({
        data: mockProfile,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await authApi.getProfile();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/auth/profile/');
      expect(result).toEqual(mockProfile);
    });

    it('handles API errors correctly', async () => {
      const errorResponse = { 
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: { error: 'Bad Request' },
        }
      };
      
      mockAxiosInstance.post.mockRejectedValue(errorResponse);

      await expect(authApi.login({
        email: 'test@example.com',
        password: 'wrong-password',
      })).rejects.toEqual(errorResponse);
    });
  });
});