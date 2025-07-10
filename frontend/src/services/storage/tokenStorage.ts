import * as SecureStore from 'expo-secure-store';
import { TokenPair } from '@types/api';

const TOKEN_KEYS = {
  ACCESS_TOKEN: 'nutrition_ai_access_token',
  REFRESH_TOKEN: 'nutrition_ai_refresh_token',
  TOKEN_EXPIRY: 'nutrition_ai_token_expiry',
};

export class TokenStorage {
  static async saveTokens(tokens: TokenPair): Promise<void> {
    try {
      await Promise.all([
        SecureStore.setItemAsync(TOKEN_KEYS.ACCESS_TOKEN, tokens.access),
        SecureStore.setItemAsync(TOKEN_KEYS.REFRESH_TOKEN, tokens.refresh),
      ]);
      
      if (tokens.accessExpiresAt) {
        await SecureStore.setItemAsync(TOKEN_KEYS.TOKEN_EXPIRY, tokens.accessExpiresAt);
      }
    } catch (error) {
      console.error('Failed to save tokens:', error);
      throw new Error('Failed to save authentication tokens');
    }
  }
  
  static async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  }
  
  static async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('Failed to get refresh token:', error);
      return null;
    }
  }
  
  static async getTokenExpiry(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEYS.TOKEN_EXPIRY);
    } catch (error) {
      console.error('Failed to get token expiry:', error);
      return null;
    }
  }
  
  static async isTokenExpired(): Promise<boolean> {
    const expiry = await this.getTokenExpiry();
    if (!expiry) return true;
    
    const expiryDate = new Date(expiry);
    const now = new Date();
    
    // Consider token expired if it expires in less than 1 minute
    const bufferTime = 60 * 1000; // 1 minute in milliseconds
    return now.getTime() + bufferTime >= expiryDate.getTime();
  }
  
  static async clearTokens(): Promise<void> {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(TOKEN_KEYS.ACCESS_TOKEN),
        SecureStore.deleteItemAsync(TOKEN_KEYS.REFRESH_TOKEN),
        SecureStore.deleteItemAsync(TOKEN_KEYS.TOKEN_EXPIRY),
      ]);
    } catch (error) {
      console.error('Failed to clear tokens:', error);
      throw new Error('Failed to clear authentication tokens');
    }
  }
  
  static async hasValidTokens(): Promise<boolean> {
    const [accessToken, refreshToken] = await Promise.all([
      this.getAccessToken(),
      this.getRefreshToken(),
    ]);
    
    return !!(accessToken && refreshToken);
  }
  
  static async getTokens(): Promise<TokenPair | null> {
    try {
      const [access, refresh, expiry] = await Promise.all([
        this.getAccessToken(),
        this.getRefreshToken(),
        this.getTokenExpiry(),
      ]);
      
      if (!access || !refresh) {
        return null;
      }
      
      return {
        access,
        refresh,
        accessExpiresAt: expiry || undefined,
      };
    } catch (error) {
      console.error('Failed to get tokens:', error);
      return null;
    }
  }
}