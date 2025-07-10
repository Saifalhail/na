import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { api } from './client';

interface QueuedRequest {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  data?: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

const QUEUE_STORAGE_KEY = '@nutrition_ai_offline_queue';
const MAX_QUEUE_SIZE = 100;
const MAX_RETRY_COUNT = 3;

export class OfflineQueue {
  private queue: QueuedRequest[] = [];
  private isProcessing = false;
  private listeners: Set<(queue: QueuedRequest[]) => void> = new Set();

  constructor() {
    this.loadQueue();
    this.setupNetworkListener();
  }

  /**
   * Add request to queue
   */
  async add(
    request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retryCount' | 'maxRetries'>
  ): Promise<void> {
    // Check queue size limit
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      // Remove oldest request
      this.queue.shift();
    }

    const queuedRequest: QueuedRequest = {
      ...request,
      id: this.generateId(),
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: MAX_RETRY_COUNT,
    };

    this.queue.push(queuedRequest);
    await this.persistQueue();
    this.notifyListeners();
  }

  /**
   * Process queued requests
   */
  async process(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Check network status
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        return;
      }

      // Process requests in order
      const requests = [...this.queue];

      for (const request of requests) {
        try {
          await this.processRequest(request);
          await this.remove(request.id);
        } catch (error) {
          await this.handleRequestError(request, error);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process single request
   */
  private async processRequest(request: QueuedRequest): Promise<void> {
    const config = {
      method: request.method,
      url: request.url,
      data: request.data,
    };

    switch (request.method) {
      case 'GET':
        await api.get(request.url);
        break;
      case 'POST':
        await api.post(request.url, request.data);
        break;
      case 'PUT':
        await api.put(request.url, request.data);
        break;
      case 'PATCH':
        await api.patch(request.url, request.data);
        break;
      case 'DELETE':
        await api.delete(request.url);
        break;
    }
  }

  /**
   * Handle request error
   */
  private async handleRequestError(request: QueuedRequest, error: any): Promise<void> {
    request.retryCount++;

    // If max retries exceeded, remove from queue
    if (request.retryCount >= request.maxRetries) {
      await this.remove(request.id);
      console.error(`Request ${request.id} failed after ${request.maxRetries} retries:`, error);
      return;
    }

    // Update retry count
    const index = this.queue.findIndex((r) => r.id === request.id);
    if (index !== -1) {
      this.queue[index] = request;
      await this.persistQueue();
    }
  }

  /**
   * Remove request from queue
   */
  async remove(id: string): Promise<void> {
    this.queue = this.queue.filter((request) => request.id !== id);
    await this.persistQueue();
    this.notifyListeners();
  }

  /**
   * Clear all queued requests
   */
  async clear(): Promise<void> {
    this.queue = [];
    await this.persistQueue();
    this.notifyListeners();
  }

  /**
   * Get current queue
   */
  getQueue(): QueuedRequest[] {
    return [...this.queue];
  }

  /**
   * Get queue size
   */
  getSize(): number {
    return this.queue.length;
  }

  /**
   * Subscribe to queue changes
   */
  subscribe(listener: (queue: QueuedRequest[]) => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Load queue from storage
   */
  private async loadQueue(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (data) {
        this.queue = JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
    }
  }

  /**
   * Persist queue to storage
   */
  private async persistQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to persist offline queue:', error);
    }
  }

  /**
   * Setup network state listener
   */
  private setupNetworkListener(): void {
    NetInfo.addEventListener((state) => {
      if (state.isConnected && !this.isProcessing) {
        // Process queue when network becomes available
        this.process();
      }
    });
  }

  /**
   * Notify listeners of queue changes
   */
  private notifyListeners(): void {
    const queue = this.getQueue();
    this.listeners.forEach((listener) => listener(queue));
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueue();
