import { useState, useEffect } from 'react';
import { OfflineManager } from '@/services/offline/OfflineManager';

export const useOffline = () => {
  const offlineManager = OfflineManager.getInstance();
  const [isOnline, setIsOnline] = useState(offlineManager.isConnected());
  const [queueSize, setQueueSize] = useState(offlineManager.getQueueSize());

  useEffect(() => {
    // Subscribe to connectivity changes
    const unsubscribe = offlineManager.onConnectivityChange((online) => {
      setIsOnline(online);
      setQueueSize(offlineManager.getQueueSize());
    });

    // Update queue size periodically
    const interval = setInterval(() => {
      setQueueSize(offlineManager.getQueueSize());
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return {
    isOnline,
    queueSize,
    queueRequest: offlineManager.queueRequest.bind(offlineManager),
    cacheData: offlineManager.cacheData.bind(offlineManager),
    getCachedData: offlineManager.getCachedData.bind(offlineManager),
    clearCache: offlineManager.clearCache.bind(offlineManager),
    clearQueue: offlineManager.clearQueue.bind(offlineManager),
  };
};
