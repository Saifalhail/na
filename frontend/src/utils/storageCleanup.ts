import AsyncStorage from '@react-native-async-storage/async-storage';
import { OfflineManager } from '@/services/offline/OfflineManager';
import { clearAllPersistedData } from '@/store/persist';

interface StorageCleanupOptions {
  clearCache?: boolean;
  clearPersistedStores?: boolean;
  clearAll?: boolean;
  verbose?: boolean;
}

export class StorageCleanup {
  /**
   * Get storage usage information
   */
  static async getStorageInfo(): Promise<{
    totalKeys: number;
    totalSize: number;
    cacheKeys: number;
    storeKeys: number;
    otherKeys: number;
  }> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      let totalSize = 0;
      let cacheKeys = 0;
      let storeKeys = 0;
      let otherKeys = 0;

      // Analyze keys and calculate approximate size
      for (const key of allKeys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            totalSize += value.length;
          }

          // Categorize keys
          if (key.startsWith('offline_cache_')) {
            cacheKeys++;
          } else if (key.includes('-storage') || key.includes('zustand')) {
            storeKeys++;
          } else {
            otherKeys++;
          }
        } catch (error) {
          // Skip problematic keys
          console.warn('Failed to read key:', key, error);
        }
      }

      return {
        totalKeys: allKeys.length,
        totalSize,
        cacheKeys,
        storeKeys,
        otherKeys,
      };
    } catch (error) {
      console.error('Failed to analyze storage:', error);
      return {
        totalKeys: 0,
        totalSize: 0,
        cacheKeys: 0,
        storeKeys: 0,
        otherKeys: 0,
      };
    }
  }

  /**
   * Clean up storage to resolve overflow issues
   */
  static async cleanupStorage(options: StorageCleanupOptions = {}): Promise<void> {
    const {
      clearCache = true,
      clearPersistedStores = false,
      clearAll = false,
      verbose = __DEV__,
    } = options;

    if (verbose) {
      console.log('🧹 [STORAGE CLEANUP] Starting storage cleanup...');
      const beforeInfo = await this.getStorageInfo();
      console.log('📊 [STORAGE CLEANUP] Before cleanup:', beforeInfo);
    }

    try {
      if (clearAll) {
        // Nuclear option - clear everything
        if (verbose) {
          console.log('🧹 [STORAGE CLEANUP] Clearing all storage...');
        }
        await AsyncStorage.clear();
      } else {
        // Selective cleanup
        if (clearCache) {
          if (verbose) {
            console.log('🧹 [STORAGE CLEANUP] Clearing cache...');
          }
          const offlineManager = OfflineManager.getInstance();
          await offlineManager.clearCache();
        }

        if (clearPersistedStores) {
          if (verbose) {
            console.log('🧹 [STORAGE CLEANUP] Clearing persisted stores...');
          }
          await clearAllPersistedData();
        }

        // Clean up orphaned or corrupted keys
        await this.cleanupOrphanedKeys(verbose);
      }

      if (verbose) {
        const afterInfo = await this.getStorageInfo();
        console.log('📊 [STORAGE CLEANUP] After cleanup:', afterInfo);
        console.log('✅ [STORAGE CLEANUP] Cleanup completed successfully');
      }
    } catch (error) {
      console.error('❌ [STORAGE CLEANUP] Cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Clean up orphaned or corrupted storage keys
   */
  private static async cleanupOrphanedKeys(verbose = false): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const keysToRemove: string[] = [];

      for (const key of allKeys) {
        try {
          const value = await AsyncStorage.getItem(key);
          
          // Check for extremely large values that might cause issues
          if (value && value.length > 1024 * 1024) { // > 1MB
            if (verbose) {
              console.warn(`🧹 [STORAGE CLEANUP] Removing large key: ${key} (${(value.length / 1024).toFixed(2)}KB)`);
            }
            keysToRemove.push(key);
            continue;
          }

          // Check for malformed JSON in cache keys
          if (key.startsWith('offline_cache_') && value) {
            try {
              JSON.parse(value);
            } catch {
              if (verbose) {
                console.warn(`🧹 [STORAGE CLEANUP] Removing corrupted cache key: ${key}`);
              }
              keysToRemove.push(key);
            }
          }
        } catch (error) {
          // If we can't read a key, it's probably corrupted
          if (verbose) {
            console.warn(`🧹 [STORAGE CLEANUP] Removing unreadable key: ${key}`);
          }
          keysToRemove.push(key);
        }
      }

      // Remove problematic keys
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
        if (verbose) {
          console.log(`🧹 [STORAGE CLEANUP] Removed ${keysToRemove.length} orphaned keys`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup orphaned keys:', error);
    }
  }

  /**
   * Emergency cleanup for storage overflow
   */
  static async emergencyCleanup(): Promise<void> {
    console.log('🚨 [EMERGENCY CLEANUP] Starting emergency storage cleanup...');
    
    try {
      // First try clearing just cache
      await this.cleanupStorage({ clearCache: true, verbose: true });
      
      // Check if that was enough
      const info = await this.getStorageInfo();
      if (info.totalKeys > 50000) { // If still too many keys
        console.log('🚨 [EMERGENCY CLEANUP] Still too many keys, clearing stores...');
        await this.cleanupStorage({ 
          clearCache: true, 
          clearPersistedStores: true, 
          verbose: true 
        });
      }
      
      // Last resort - nuclear option
      const finalInfo = await this.getStorageInfo();
      if (finalInfo.totalKeys > 100000) {
        console.log('🚨 [EMERGENCY CLEANUP] Nuclear option - clearing all storage...');
        await this.cleanupStorage({ clearAll: true, verbose: true });
      }
      
      console.log('✅ [EMERGENCY CLEANUP] Emergency cleanup completed');
    } catch (error) {
      console.error('❌ [EMERGENCY CLEANUP] Emergency cleanup failed:', error);
      // As last resort, try native clear
      try {
        await AsyncStorage.clear();
        console.log('✅ [EMERGENCY CLEANUP] Native clear succeeded');
      } catch (clearError) {
        console.error('❌ [EMERGENCY CLEANUP] Even native clear failed:', clearError);
      }
    }
  }
}

// Export convenience functions
export const getStorageInfo = StorageCleanup.getStorageInfo;
export const cleanupStorage = StorageCleanup.cleanupStorage;
export const emergencyCleanup = StorageCleanup.emergencyCleanup;