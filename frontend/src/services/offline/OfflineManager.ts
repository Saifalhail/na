import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { createStorage, Storage } from '@/utils/storage';
import { apiClient } from '@/services/api';
import { rs } from '@/utils/responsive';

interface QueuedRequest {
  id: string;
  timestamp: number;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  data?: any;
  headers?: Record<string, string>;
  retryCount: number;
  maxRetries: number;
}

interface OfflineCache {
  key: string;
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class OfflineManager {
  private static instance: OfflineManager;
  private storage: Storage;
  private isOnline: boolean = true;
  private requestQueue: QueuedRequest[] = [];
  private cacheStore: Map<string, OfflineCache> = new Map();
  private listeners: Array<(isOnline: boolean) => void> = [];
  private syncInProgress: boolean = false;

  private readonly QUEUE_KEY = 'offline_request_queue';
  private readonly CACHE_PREFIX = 'offline_cache_';
  private readonly MAX_QUEUE_SIZE = 100;
  private readonly DEFAULT_TTL = 1000 * 60 * 60 * 24; // 24 hours

  private constructor() {
    this.storage = createStorage('offline-storage');
    this.initialize();
  }

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  private async initialize() {
    // Load queued requests from storage
    await this.loadQueueFromStorage();

    // Load cached data
    await this.loadCacheFromStorage();

    // Set up network monitoring
    const netInfoState = await NetInfo.fetch();
    this.handleConnectivityChange(netInfoState);

    // Subscribe to network changes
    NetInfo.addEventListener((state) => {
      this.handleConnectivityChange(state);
    });
  }

  private handleConnectivityChange(state: NetInfoState) {
    const wasOnline = this.isOnline;
    this.isOnline = (state.isConnected && state.isInternetReachable) || false;

    if (!wasOnline && this.isOnline) {
      // Connection restored - process queued requests
      this.processQueue();
    }

    // Notify listeners
    this.listeners.forEach((listener) => listener(this.isOnline));
  }

  private async loadQueueFromStorage() {
    try {
      const queueData = await this.storage.getString(this.QUEUE_KEY);
      if (queueData) {
        this.requestQueue = JSON.parse(queueData);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
    }
  }

  private async saveQueueToStorage() {
    try {
      await this.storage.set(this.QUEUE_KEY, JSON.stringify(this.requestQueue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  private async loadCacheFromStorage() {
    try {
      const keys = await this.storage.getAllKeys();
      for (const key of keys) {
        if (key.startsWith(this.CACHE_PREFIX)) {
          const cacheData = await this.storage.getString(key);
          if (cacheData) {
            const cache: OfflineCache = JSON.parse(cacheData);
            // Check if cache is still valid
            if (Date.now() - cache.timestamp < cache.ttl) {
              this.cacheStore.set(cache.key, cache);
            } else {
              // Remove expired cache
              await this.storage.delete(key);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load cache from storage:', error);
    }
  }

  // Public methods

  /**
   * Check if the app is currently online
   */
  isConnected(): boolean {
    return this.isOnline;
  }

  /**
   * Subscribe to connectivity changes
   */
  onConnectivityChange(listener: (isOnline: boolean) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Queue a request to be executed when online
   */
  async queueRequest(
    method: QueuedRequest['method'],
    url: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<void> {
    if (this.requestQueue.length >= this.MAX_QUEUE_SIZE) {
      throw new Error('Offline queue is full');
    }

    const request: QueuedRequest = {
      id: `${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      method,
      url,
      data,
      headers,
      retryCount: 0,
      maxRetries: 3,
    };

    this.requestQueue.push(request);
    this.saveQueueToStorage();

    // Try to process immediately if online
    if (this.isOnline) {
      this.processQueue();
    }
  }

  /**
   * Process queued requests
   */
  private async processQueue() {
    if (this.syncInProgress || !this.isOnline || this.requestQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;

    try {
      // Process requests in order
      while (this.requestQueue.length > 0 && this.isOnline) {
        const request = this.requestQueue[0];

        try {
          await this.executeRequest(request);

          // Remove successful request from queue
          this.requestQueue.shift();
          this.saveQueueToStorage();
        } catch (error) {
          console.error('Failed to process queued request:', error);

          // Increment retry count
          request.retryCount++;

          if (request.retryCount >= request.maxRetries) {
            // Remove failed request after max retries
            this.requestQueue.shift();
            await this.saveQueueToStorage();

            // Notify about failed request
            this.notifyRequestFailed(request);
          } else {
            // Move to end of queue
            this.requestQueue.push(this.requestQueue.shift()!);
            await this.saveQueueToStorage();
          }
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  private async executeRequest(request: QueuedRequest): Promise<any> {
    const config = {
      method: request.method,
      url: request.url,
      data: request.data,
      headers: request.headers,
    };

    return await apiClient(config);
  }

  private notifyRequestFailed(request: QueuedRequest) {
    // Could emit an event or show a notification
    console.error('Request permanently failed after retries:', request);
  }

  /**
   * Cache data for offline access
   */
  async cacheData(key: string, data: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
    const cache: OfflineCache = {
      key,
      data,
      timestamp: Date.now(),
      ttl,
    };

    this.cacheStore.set(key, cache);
    await this.storage.set(this.CACHE_PREFIX + key, JSON.stringify(cache));
  }

  /**
   * Get cached data
   */
  async getCachedData<T = any>(key: string): Promise<T | null> {
    const cache = this.cacheStore.get(key);

    if (!cache) {
      return null;
    }

    // Check if cache is still valid
    if (Date.now() - cache.timestamp > cache.ttl) {
      // Remove expired cache
      this.cacheStore.delete(key);
      await this.storage.delete(this.CACHE_PREFIX + key);
      return null;
    }

    return cache.data as T;
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    this.cacheStore.clear();

    // Clear from storage
    const keys = await this.storage.getAllKeys();
    await Promise.all(
      keys.filter((key) => key.startsWith(this.CACHE_PREFIX)).map((key) => this.storage.delete(key))
    );
  }

  /**
   * Get offline queue size
   */
  getQueueSize(): number {
    return this.requestQueue.length;
  }

  /**
   * Clear offline queue
   */
  async clearQueue(): Promise<void> {
    this.requestQueue = [];
    await this.saveQueueToStorage();
  }

  /**
   * Get queue items
   */
  getQueueItems(): QueuedRequest[] {
    return [...this.requestQueue];
  }
}
