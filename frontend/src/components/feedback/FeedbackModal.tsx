import React, { useState } from 'react';
import { borderRadius, rs } from '@/utils/responsive';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Modal } from '@/components/base/Modal';
import { Button } from '@/components/base/Button';
import { useTheme } from '@/hooks/useTheme';
import { useAnalytics } from '@/hooks/useAnalytics';
import { feedbackApi } from '@/services/api/endpoints/feedback';
import { Ionicons } from '@expo/vector-icons';

interface FeedbackModalProps {
  isVisible: boolean;
  onClose: () => void;
  initialType?: 'bug' | 'feature' | 'general';
  initialContext?: {
    screen?: string;
    action?: string;
    [key: string]: any;
  };
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isVisible,
  onClose,
  initialType = 'general',
  initialContext,
}) => {
  const { theme } = useTheme();
  const { trackEvent } = useAnalytics();
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'general'>(initialType);
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const styles = createStyles(theme);

  const handleSubmit = async () => {
    if (!message.trim()) return;

    setIsSubmitting(true);
    trackEvent('feedback_submitted', {
      type: feedbackType,
      rating,
      has_email: !!email,
      message_length: message.length,
      ...initialContext,
    });

    try {
      await feedbackApi.submitFeedback({
        type: feedbackType,
        rating,
        message,
        email: email || undefined,
        context: initialContext,
      });

      // Reset form
      setMessage('');
      setEmail('');
      setRating(0);
      onClose();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStarRating = () => (
    <View style={styles.ratingContainer}>
      <Text style={styles.label}>How would you rate your experience?</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => setRating(star)} style={styles.starButton}>
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={32}
              color={star <= rating ? theme.colors.warning[500] : theme.colors.neutral[400]}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderFeedbackTypes = () => (
    <View style={styles.typeContainer}>
      <Text style={styles.label}>What type of feedback?</Text>
      <View style={styles.typeButtons}>
        {[
          { type: 'bug' as const, icon: 'bug-outline', label: 'Report Bug' },
          { type: 'feature' as const, icon: 'bulb-outline', label: 'Request Feature' },
          { type: 'general' as const, icon: 'chatbubble-outline', label: 'General' },
        ].map(({ type, icon, label }) => (
          <TouchableOpacity
            key={type}
            style={[styles.typeButton, feedbackType === type && styles.typeButtonActive]}
            onPress={() => setFeedbackType(type)}
          >
            <Ionicons
              name={icon as any}
              size={24}
              color={feedbackType === type ? theme.colors.primary[600] : theme.colors.neutral[600]}
            />
            <Text
              style={[styles.typeButtonText, feedbackType === type && styles.typeButtonTextActive]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <Modal visible={isVisible} onClose={onClose} title="Send Feedback" size="large">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {renderFeedbackTypes()}
          {renderStarRating()}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Your feedback</Text>
            <TextInput
              style={styles.textArea}
              placeholder={
                feedbackType === 'bug'
                  ? "Describe the issue you're experiencing..."
                  : feedbackType === 'feature'
                    ? 'Describe the feature you would like to see...'
                    : 'Share your thoughts with us...'
              }
              placeholderTextColor={theme.colors.neutral[400]}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={theme.colors.neutral[400]}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.hint}>Provide your email if you'd like us to follow up</Text>
          </View>

          <View style={styles.actions}>
            <Button onPress={onClose} variant="outline" style={styles.button}>
              Cancel
            </Button>
            <Button
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={!message.trim()}
              style={styles.button}
            >
              Submit
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    typeContainer: {
      marginBottom: theme.spacing.l,
    },
    label: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.s,
    },
    typeButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    typeButton: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
      padding: theme.spacing.m,
      marginHorizontal: theme.spacing.xs,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.neutral[100],
      borderWidth: 2,
      borderColor: 'transparent',
    },
    typeButtonActive: {
      backgroundColor: theme.colors.primary[50],
      borderColor: theme.colors.primary[500],
    },
    typeButtonText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.xs,
    },
    typeButtonTextActive: {
      color: theme.colors.primary[600],
      fontWeight: theme.typography.fontWeight.medium,
    },
    ratingContainer: {
      marginBottom: theme.spacing.l,
    },
    stars: {
      flexDirection: 'row',
      justifyContent: 'center',
    },
    starButton: {
      padding: theme.spacing.xs,
    },
    inputContainer: {
      marginBottom: theme.spacing.l,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.neutral[300],
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.m,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      backgroundColor: theme.colors.background,
    },
    textArea: {
      borderWidth: 1,
      borderColor: theme.colors.neutral[300],
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.m,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      backgroundColor: theme.colors.background,
      minHeight: 120,
    },
    hint: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.xs,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    button: {
      marginLeft: theme.spacing.s,
      minWidth: 100,
    },
  });
