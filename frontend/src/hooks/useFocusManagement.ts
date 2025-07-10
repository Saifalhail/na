import { useRef, useCallback, useEffect } from 'react';
import { findNodeHandle, AccessibilityInfo, Platform } from 'react-native';

interface FocusableElement {
  ref: React.RefObject<any>;
  label: string;
  order?: number;
}

interface UseFocusManagementOptions {
  autoFocusFirst?: boolean;
  trapFocus?: boolean;
  restoreFocus?: boolean;
}

export const useFocusManagement = (
  elements: FocusableElement[],
  options: UseFocusManagementOptions = {}
) => {
  const { autoFocusFirst = false, trapFocus = false, restoreFocus = true } = options;

  const currentFocusIndex = useRef(0);
  const previousFocusRef = useRef<any>(null);

  // Sort elements by order if specified
  const sortedElements = elements.sort((a, b) => {
    if (a.order === undefined && b.order === undefined) return 0;
    if (a.order === undefined) return 1;
    if (b.order === undefined) return -1;
    return a.order - b.order;
  });

  // Store previous focus when component mounts
  useEffect(() => {
    if (restoreFocus && Platform.OS === 'ios') {
      // Store current focus
      // Note: This is a simplified version. In production, you'd want to
      // properly track the previously focused element
    }

    return () => {
      if (restoreFocus && previousFocusRef.current) {
        // Restore focus to previous element
        const handle = findNodeHandle(previousFocusRef.current);
        if (handle) {
          AccessibilityInfo.setAccessibilityFocus(handle);
        }
      }
    };
  }, [restoreFocus]);

  // Auto-focus first element
  useEffect(() => {
    if (autoFocusFirst && sortedElements.length > 0) {
      setTimeout(() => {
        focusElement(0);
      }, 100);
    }
  }, [autoFocusFirst]);

  const focusElement = useCallback(
    (index: number) => {
      if (index < 0 || index >= sortedElements.length) return;

      const element = sortedElements[index];
      if (element.ref.current) {
        const handle = findNodeHandle(element.ref.current);
        if (handle) {
          AccessibilityInfo.setAccessibilityFocus(handle);
          currentFocusIndex.current = index;
        }
      }
    },
    [sortedElements]
  );

  const focusNext = useCallback(() => {
    let nextIndex = currentFocusIndex.current + 1;

    if (trapFocus && nextIndex >= sortedElements.length) {
      nextIndex = 0;
    }

    if (nextIndex < sortedElements.length) {
      focusElement(nextIndex);
    }
  }, [sortedElements, trapFocus, focusElement]);

  const focusPrevious = useCallback(() => {
    let prevIndex = currentFocusIndex.current - 1;

    if (trapFocus && prevIndex < 0) {
      prevIndex = sortedElements.length - 1;
    }

    if (prevIndex >= 0) {
      focusElement(prevIndex);
    }
  }, [sortedElements, trapFocus, focusElement]);

  const focusFirst = useCallback(() => {
    focusElement(0);
  }, [focusElement]);

  const focusLast = useCallback(() => {
    focusElement(sortedElements.length - 1);
  }, [sortedElements, focusElement]);

  const focusByLabel = useCallback(
    (label: string) => {
      const index = sortedElements.findIndex((el) => el.label === label);
      if (index !== -1) {
        focusElement(index);
      }
    },
    [sortedElements, focusElement]
  );

  // Announce focus changes
  const announceFocus = useCallback((message: string) => {
    AccessibilityInfo.announceForAccessibility(message);
  }, []);

  return {
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    focusByLabel,
    focusElement,
    announceFocus,
    currentFocusIndex: currentFocusIndex.current,
    totalElements: sortedElements.length,
  };
};

/**
 * Hook for managing keyboard navigation
 */
export const useKeyboardNavigation = (
  onNavigate: (direction: 'up' | 'down' | 'left' | 'right' | 'enter') => void
) => {
  useEffect(() => {
    // Note: React Native doesn't have built-in keyboard event handling
    // like web. This would need to be implemented using a native module
    // or a library like react-native-keyevent

    // Placeholder for keyboard event handling
    const handleKeyPress = (event: any) => {
      switch (event.key) {
        case 'ArrowUp':
          onNavigate('up');
          break;
        case 'ArrowDown':
          onNavigate('down');
          break;
        case 'ArrowLeft':
          onNavigate('left');
          break;
        case 'ArrowRight':
          onNavigate('right');
          break;
        case 'Enter':
          onNavigate('enter');
          break;
      }
    };

    // In a real implementation, you'd add event listeners here

    return () => {
      // Cleanup event listeners
    };
  }, [onNavigate]);
};

/**
 * Hook for managing focus traps (e.g., in modals)
 */
export const useFocusTrap = (isActive: boolean) => {
  const firstElementRef = useRef<any>(null);
  const lastElementRef = useRef<any>(null);

  useEffect(() => {
    if (!isActive) return;

    // Focus first element when trap becomes active
    if (firstElementRef.current) {
      const handle = findNodeHandle(firstElementRef.current);
      if (handle) {
        AccessibilityInfo.setAccessibilityFocus(handle);
      }
    }

    // Note: Implementing actual focus trapping in React Native
    // requires native modules or specific libraries
  }, [isActive]);

  return {
    firstElementRef,
    lastElementRef,
  };
};
