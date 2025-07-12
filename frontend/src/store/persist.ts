import { StateStorage } from 'zustand/middleware';
import { 
  asyncStorageAdapter, 
  clearAllAsyncStorage, 
  getAllAsyncStorageKeys 
} from './asyncStorageAdapter';

// Use AsyncStorage for all environments (works perfectly in Expo Go)
const storageAdapter: StateStorage = asyncStorageAdapter;
const clearAllPersistedData = clearAllAsyncStorage;
const getAllStorageKeys = getAllAsyncStorageKeys;

// Export the storage adapter and helper functions
export { 
  storageAdapter as mmkvStorage, // Keep the same export name for compatibility
  clearAllPersistedData, 
  getAllStorageKeys 
};