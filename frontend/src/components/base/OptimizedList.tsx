import React, { useMemo, useCallback, useRef } from 'react';
import {
  FlatList,
  FlatListProps,
  VirtualizedList,
  ListRenderItem,
  ViewToken,
  RefreshControl,
} from 'react-native';
import { ListOptimization, useThrottle } from '@/utils/performance';
import { useTheme } from '@/hooks/useTheme';

interface OptimizedListProps<T> extends Omit<FlatListProps<T>, 'renderItem'> {
  data: T[] | null | undefined;
  renderItem: ListRenderItem<T>;
  itemHeight?: number;
  estimatedItemSize?: number;
  maxToRenderPerBatch?: number;
  updateCellsBatchingPeriod?: number;
  windowSize?: number;
  initialNumToRender?: number;
  removeClippedSubviews?: boolean;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
  onEndReachedThreshold?: number;
  maintainVisibleContentPosition?: boolean;
  debug?: boolean;
}

export function OptimizedList<T>({
  data,
  renderItem,
  itemHeight,
  estimatedItemSize = 100,
  maxToRenderPerBatch = 10,
  updateCellsBatchingPeriod = 50,
  windowSize = 21,
  initialNumToRender = 10,
  removeClippedSubviews = true,
  onRefresh,
  refreshing = false,
  onEndReachedThreshold = 0.5,
  maintainVisibleContentPosition = false,
  debug = false,
  ...props
}: OptimizedListProps<T>) {
  const { theme } = useTheme();
  const listRef = useRef<FlatList<T>>(null);
  const viewabilityConfigCallbackPairs = useRef<any[]>([]);
  
  // Memoize getItemLayout if itemHeight is provided
  const getItemLayout = useMemo(() => {
    if (itemHeight) {
      return ListOptimization.getItemLayout(itemHeight);
    }
    return undefined;
  }, [itemHeight]);
  
  // Memoize keyExtractor
  const keyExtractor = useCallback((item: T, index: number) => {
    if (props.keyExtractor) {
      return props.keyExtractor(item, index);
    }
    return ListOptimization.keyExtractor(item);
  }, [props.keyExtractor]);
  
  // Throttle onEndReached to prevent multiple calls
  const throttledOnEndReached = useThrottle(
    props.onEndReached || (() => {}),
    1000
  );
  
  // Memoize renderItem to prevent unnecessary re-renders
  const memoizedRenderItem = useCallback<ListRenderItem<T>>(
    (info) => {
      if (debug) {
        console.log(`Rendering item at index ${info.index}`);
      }
      return renderItem(info);
    },
    [renderItem, debug]
  );
  
  // Handle viewability changes
  const onViewableItemsChanged = useCallback(
    ({ viewableItems, changed }: { viewableItems: ViewToken[]; changed: ViewToken[] }) => {
      if (debug) {
        console.log(`Viewable items: ${viewableItems.length}, Changed: ${changed.length}`);
      }
      props.onViewableItemsChanged?.({ viewableItems, changed });
    },
    [props.onViewableItemsChanged, debug]
  );
  
  // Optimized refresh control
  const refreshControl = useMemo(() => {
    if (onRefresh) {
      return (
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary[500]}
          colors={[theme.colors.primary[500]]}
        />
      );
    }
    return undefined;
  }, [onRefresh, refreshing, theme.colors.primary]);
  
  // Performance optimizations for large lists
  const listOptimizations = useMemo(() => ({
    maxToRenderPerBatch,
    updateCellsBatchingPeriod,
    windowSize,
    initialNumToRender,
    removeClippedSubviews,
  }), [
    maxToRenderPerBatch,
    updateCellsBatchingPeriod,
    windowSize,
    initialNumToRender,
    removeClippedSubviews,
  ]);
  
  // Maintain scroll position optimization
  const maintainVisibleContentPositionConfig = useMemo(() => {
    if (maintainVisibleContentPosition) {
      return {
        minIndexForVisible: 0,
        autoscrollToTopThreshold: 10,
      };
    }
    return undefined;
  }, [maintainVisibleContentPosition]);
  
  return (
    <FlatList<T>
      ref={listRef}
      {...props}
      {...listOptimizations}
      data={data}
      renderItem={memoizedRenderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      onEndReached={throttledOnEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      refreshControl={refreshControl}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={ListOptimization.viewabilityConfig}
      maintainVisibleContentPosition={maintainVisibleContentPositionConfig}
      // Additional performance props
      directionalLockEnabled={true}
      scrollEventThrottle={16}
      legacyImplementation={false}
      // @ts-ignore - New optimization props
      optimizationsEnabled={true}
      drawDistance={estimatedItemSize * windowSize}
    />
  );
}

// Virtualized list wrapper for extreme performance
export function VirtualizedOptimizedList<T>({
  data,
  renderItem,
  getItem,
  getItemCount,
  ...props
}: Omit<OptimizedListProps<T>, 'data'> & {
  data: any;
  getItem: (data: any, index: number) => T;
  getItemCount: (data: any) => number;
}) {
  const memoizedGetItem = useCallback(getItem, []);
  const memoizedGetItemCount = useCallback(getItemCount, []);
  
  return (
    <VirtualizedList
      {...props}
      data={data}
      renderItem={renderItem}
      getItem={memoizedGetItem}
      getItemCount={memoizedGetItemCount}
      keyExtractor={props.keyExtractor || ListOptimization.keyExtractor}
      windowSize={props.windowSize || 21}
      maxToRenderPerBatch={props.maxToRenderPerBatch || 10}
      updateCellsBatchingPeriod={props.updateCellsBatchingPeriod || 50}
      initialNumToRender={props.initialNumToRender || 10}
      removeClippedSubviews={props.removeClippedSubviews ?? true}
    />
  );
}

// Export list optimization utilities
export { ListOptimization };