import { StateStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';

// Initialize MMKV instance
const storage = new MMKV({
  id: 'nutrition-ai-storage',
  encryptionKey: 'nutrition-ai-encryption-key', // In production, use a secure key
});

// Create Zustand storage adapter for MMKV
export const mmkvStorage: StateStorage = {
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string) => {
    storage.set(name, value);
  },
  removeItem: (name: string) => {
    storage.delete(name);
  },
};

// Helper to clear all persisted data
export const clearAllPersistedData = () => {
  storage.clearAll();
};

// Helper to get all keys
export const getAllStorageKeys = () => {
  return storage.getAllKeys();
};