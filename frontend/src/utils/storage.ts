import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage interface for abstraction
export interface Storage {
  getString: (key: string) => Promise<string | undefined>;
  set: (key: string, value: string) => Promise<void>;
  delete: (key: string) => Promise<void>;
  clearAll: () => Promise<void>;
  getAllKeys: () => Promise<string[]>;
}

// AsyncStorage adapter implementation
class AsyncStorageAdapter implements Storage {
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}_${key}`;
  }

  async getString(key: string): Promise<string | undefined> {
    try {
      const value = await AsyncStorage.getItem(this.getKey(key));
      return value ?? undefined;
    } catch {
      return undefined;
    }
  }

  async set(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(this.getKey(key), value);
  }

  async delete(key: string): Promise<void> {
    await AsyncStorage.removeItem(this.getKey(key));
  }

  async clearAll(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const prefixedKeys = keys.filter((k) => k.startsWith(`${this.prefix}_`));
    await AsyncStorage.multiRemove(prefixedKeys);
  }

  async getAllKeys(): Promise<string[]> {
    const keys = await AsyncStorage.getAllKeys();
    return keys
      .filter((k) => k.startsWith(`${this.prefix}_`))
      .map((k) => k.replace(`${this.prefix}_`, ''));
  }
}

// Create storage instance with unique ID (always use AsyncStorage)
export const createStorage = (id: string, encryptionKey?: string): Storage => {
  // Always use AsyncStorage - it works perfectly in Expo Go and production
  return new AsyncStorageAdapter(id);
};

// Helper to check if we're using AsyncStorage (always true now)
export const isUsingAsyncStorage = (): boolean => {
  return true;
};
