import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useFeedback } from '@/hooks/useFeedback';

interface FeedbackButtonProps {
  style?: any;
  size?: number;
  color?: string;
}

export const FeedbackButton: React.FC<FeedbackButtonProps> = ({ style, size = 24, color }) => {
  const { theme } = useTheme();
  const { openFeedback } = useFeedback();

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={() => openFeedback()}
      accessibilityLabel="Send feedback"
      accessibilityRole="button"
    >
      <Ionicons
        name="chatbubble-ellipses-outline"
        size={size}
        color={color || theme.colors.primary[600]}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 8,
  },
});
