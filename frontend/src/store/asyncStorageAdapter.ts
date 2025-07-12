import AsyncStorage from '@react-native-async-storage/async-storage';
import { StateStorage } from 'zustand/middleware';

// Create Zustand storage adapter for AsyncStorage
export const asyncStorageAdapter: StateStorage = {
  getItem: async (name: string) => {
    try {
      const value = await AsyncStorage.getItem(name);
      return value ?? null;
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string) => {
    await AsyncStorage.setItem(name, value);
  },
  removeItem: async (name: string) => {
    await AsyncStorage.removeItem(name);
  },
};

// Helper functions
export const clearAllAsyncStorage = async () => {
  await AsyncStorage.clear();
};

export const getAllAsyncStorageKeys = async () => {
  return await AsyncStorage.getAllKeys();
};