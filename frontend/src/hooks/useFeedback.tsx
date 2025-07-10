import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { FeedbackModal } from '@/components/feedback/FeedbackModal';

interface FeedbackContextValue {
  openFeedback: (type?: 'bug' | 'feature' | 'general', context?: Record<string, any>) => void;
  closeFeedback: () => void;
}

const FeedbackContext = createContext<FeedbackContextValue | undefined>(undefined);

interface FeedbackProviderProps {
  children: ReactNode;
}

export const FeedbackProvider: React.FC<FeedbackProviderProps> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'general'>('general');
  const [feedbackContext, setFeedbackContext] = useState<Record<string, any> | undefined>();

  const openFeedback = useCallback(
    (type: 'bug' | 'feature' | 'general' = 'general', context?: Record<string, any>) => {
      setFeedbackType(type);
      setFeedbackContext(context);
      setIsVisible(true);
    },
    []
  );

  const closeFeedback = useCallback(() => {
    setIsVisible(false);
  }, []);

  return (
    <FeedbackContext.Provider value={{ openFeedback, closeFeedback }}>
      {children}
      <FeedbackModal
        isVisible={isVisible}
        onClose={closeFeedback}
        initialType={feedbackType}
        initialContext={feedbackContext}
      />
    </FeedbackContext.Provider>
  );
};

export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
};
