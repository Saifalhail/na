import { useState, useRef, useCallback, useMemo } from 'react';

/**
 * Optimized state hook that reduces unnecessary re-renders
 */
export function useOptimizedState<T>(
  initialValue: T | (() => T),
  options?: {
    // Custom equality function
    isEqual?: (prev: T, next: T) => boolean;
    // Enable batching of state updates
    batchUpdates?: boolean;
    // Maximum batch size before flushing
    maxBatchSize?: number;
  }
): [T, (value: T | ((prev: T) => T)) => void] {
  const { 
    isEqual = Object.is, 
    batchUpdates = false, 
    maxBatchSize = 10 
  } = options || {};
  
  const [state, setState] = useState(initialValue);
  const batchRef = useRef<Array<T | ((prev: T) => T)>>([]);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  const flushBatch = useCallback(() => {
    if (batchRef.current.length === 0) return;
    
    const updates = batchRef.current;
    batchRef.current = [];
    
    setState(currentState => {
      let newState = currentState;
      
      for (const update of updates) {
        newState = typeof update === 'function' 
          ? (update as (prev: T) => T)(newState)
          : update;
      }
      
      return isEqual(currentState, newState) ? currentState : newState;
    });
  }, [isEqual]);
  
  const optimizedSetState = useCallback((value: T | ((prev: T) => T)) => {
    if (batchUpdates) {
      batchRef.current.push(value);
      
      if (batchRef.current.length >= maxBatchSize) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        flushBatch();
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(flushBatch, 0);
      }
    } else {
      setState(currentState => {
        const newState = typeof value === 'function' 
          ? (value as (prev: T) => T)(currentState)
          : value;
        
        return isEqual(currentState, newState) ? currentState : newState;
      });
    }
  }, [batchUpdates, maxBatchSize, flushBatch, isEqual]);
  
  return [state, optimizedSetState];
}

/**
 * State hook with built-in shallow comparison
 */
export function useShallowState<T extends Record<string, any>>(
  initialValue: T | (() => T)
): [T, (value: Partial<T> | ((prev: T) => Partial<T>)) => void] {
  const shallowEqual = useCallback((prev: T, next: T) => {
    const prevKeys = Object.keys(prev);
    const nextKeys = Object.keys(next);
    
    if (prevKeys.length !== nextKeys.length) return false;
    
    for (const key of prevKeys) {
      if (prev[key] !== next[key]) return false;
    }
    
    return true;
  }, []);
  
  const [state, setState] = useOptimizedState(initialValue, { isEqual: shallowEqual });
  
  const shallowSetState = useCallback((value: Partial<T> | ((prev: T) => Partial<T>)) => {
    setState(prev => {
      const update = typeof value === 'function' ? value(prev) : value;
      return { ...prev, ...update };
    });
  }, [setState]);
  
  return [state, shallowSetState];
}

/**
 * Array state hook with optimized operations
 */
export function useArrayState<T>(
  initialValue: T[] | (() => T[])
): {
  items: T[];
  push: (item: T) => void;
  pop: () => T | undefined;
  remove: (index: number) => void;
  removeBy: (predicate: (item: T, index: number) => boolean) => void;
  update: (index: number, item: T) => void;
  updateBy: (predicate: (item: T, index: number) => boolean, updater: (item: T) => T) => void;
  clear: () => void;
  replace: (items: T[]) => void;
} {
  const [items, setItems] = useOptimizedState(initialValue, {
    isEqual: (prev, next) => prev.length === next.length && prev.every((item, index) => item === next[index])
  });
  
  const operations = useMemo(() => ({
    push: (item: T) => setItems(prev => [...prev, item]),
    pop: () => {
      let poppedItem: T | undefined;
      setItems(prev => {
        if (prev.length === 0) return prev;
        poppedItem = prev[prev.length - 1];
        return prev.slice(0, -1);
      });
      return poppedItem;
    },
    remove: (index: number) => setItems(prev => prev.filter((_, i) => i !== index)),
    removeBy: (predicate: (item: T, index: number) => boolean) => 
      setItems(prev => prev.filter((item, index) => !predicate(item, index))),
    update: (index: number, item: T) => 
      setItems(prev => prev.map((prevItem, i) => i === index ? item : prevItem)),
    updateBy: (predicate: (item: T, index: number) => boolean, updater: (item: T) => T) =>
      setItems(prev => prev.map((item, index) => predicate(item, index) ? updater(item) : item)),
    clear: () => setItems([]),
    replace: (newItems: T[]) => setItems(newItems),
  }), [setItems]);
  
  return {
    items,
    ...operations,
  };
}

/**
 * Object state hook with nested updates support
 */
export function useObjectState<T extends Record<string, any>>(
  initialValue: T | (() => T)
): {
  state: T;
  update: (path: string, value: any) => void;
  merge: (updates: Partial<T>) => void;
  reset: () => void;
  set: (value: T) => void;
} {
  const [state, setState] = useShallowState(initialValue);
  const initialRef = useRef(typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue);
  
  const operations = useMemo(() => ({
    update: (path: string, value: any) => {
      setState(prev => {
        const keys = path.split('.');
        const newState = { ...prev };
        let current: any = newState;
        
        for (let i = 0; i < keys.length - 1; i++) {
          const key = keys[i];
          current[key] = { ...current[key] };
          current = current[key];
        }
        
        current[keys[keys.length - 1]] = value;
        return newState;
      });
    },
    merge: (updates: Partial<T>) => setState(updates),
    reset: () => setState(initialRef.current),
    set: (value: T) => setState(() => value),
  }), [setState]);
  
  return {
    state,
    ...operations,
  };
}