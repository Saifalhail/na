import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from './persist';

type Theme = 'light' | 'dark' | 'system';
type LoadingState = {
  [key: string]: boolean;
};

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface UIState {
  // Theme
  theme: Theme;
  systemTheme: 'light' | 'dark';
  
  // Loading states
  loadingStates: LoadingState;
  globalLoading: boolean;
  
  // Toast notifications
  toasts: Toast[];
  
  // Modal states
  activeModal: string | null;
  modalData: any;
  
  // Navigation
  currentRoute: string;
  previousRoute: string | null;
  
  // Network status
  isOnline: boolean;
  
  // Actions
  setTheme: (theme: Theme) => void;
  setSystemTheme: (theme: 'light' | 'dark') => void;
  setLoading: (key: string, isLoading: boolean) => void;
  setGlobalLoading: (isLoading: boolean) => void;
  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id: string) => void;
  clearToasts: () => void;
  openModal: (modalId: string, data?: any) => void;
  closeModal: () => void;
  setCurrentRoute: (route: string) => void;
  setOnlineStatus: (isOnline: boolean) => void;
  reset: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Initial state
      theme: 'system',
      systemTheme: 'light',
      loadingStates: {},
      globalLoading: false,
      toasts: [],
      activeModal: null,
      modalData: null,
      currentRoute: 'Home',
      previousRoute: null,
      isOnline: true,

      // Set theme
      setTheme: (theme: Theme) => set({ theme }),

      // Set system theme
      setSystemTheme: (systemTheme: 'light' | 'dark') => set({ systemTheme }),

      // Set loading state
      setLoading: (key: string, isLoading: boolean) => {
        const { loadingStates } = get();
        set({
          loadingStates: {
            ...loadingStates,
            [key]: isLoading,
          },
        });
      },

      // Set global loading
      setGlobalLoading: (globalLoading: boolean) => set({ globalLoading }),

      // Show toast
      showToast: (toast: Omit<Toast, 'id'>) => {
        const id = Date.now().toString();
        const newToast = { ...toast, id };
        
        set((state) => ({
          toasts: [...state.toasts, newToast],
        }));

        // Auto-hide after duration
        if (toast.duration !== 0) {
          setTimeout(() => {
            get().hideToast(id);
          }, toast.duration || 3000);
        }
      },

      // Hide toast
      hideToast: (id: string) => {
        set((state) => ({
          toasts: state.toasts.filter(toast => toast.id !== id),
        }));
      },

      // Clear all toasts
      clearToasts: () => set({ toasts: [] }),

      // Open modal
      openModal: (modalId: string, data?: any) => {
        set({
          activeModal: modalId,
          modalData: data,
        });
      },

      // Close modal
      closeModal: () => {
        set({
          activeModal: null,
          modalData: null,
        });
      },

      // Set current route
      setCurrentRoute: (route: string) => {
        const { currentRoute } = get();
        set({
          currentRoute: route,
          previousRoute: currentRoute,
        });
      },

      // Set online status
      setOnlineStatus: (isOnline: boolean) => set({ isOnline }),

      // Reset store
      reset: () => set({
        loadingStates: {},
        globalLoading: false,
        toasts: [],
        activeModal: null,
        modalData: null,
        currentRoute: 'Home',
        previousRoute: null,
        isOnline: true,
      }),
    }),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        theme: state.theme,
      }),
    }
  )
);

// Helper hooks
export const useTheme = () => {
  const theme = useUIStore((state) => state.theme);
  const systemTheme = useUIStore((state) => state.systemTheme);
  
  const actualTheme = theme === 'system' ? systemTheme : theme;
  const isDark = actualTheme === 'dark';
  
  return { theme: actualTheme, isDark };
};

export const useLoading = (key: string) => {
  const isLoading = useUIStore((state) => state.loadingStates[key] || false);
  const setLoading = useUIStore((state) => state.setLoading);
  
  return {
    isLoading,
    setLoading: (loading: boolean) => setLoading(key, loading),
  };
};

export const useToast = () => {
  const showToast = useUIStore((state) => state.showToast);
  
  return {
    showSuccess: (message: string, duration?: number) =>
      showToast({ type: 'success', message, duration }),
    showError: (message: string, duration?: number) =>
      showToast({ type: 'error', message, duration }),
    showWarning: (message: string, duration?: number) =>
      showToast({ type: 'warning', message, duration }),
    showInfo: (message: string, duration?: number) =>
      showToast({ type: 'info', message, duration }),
  };
};