import React, { useEffect, useRef } from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  AccessibilityInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useFocusTrap } from '@/hooks/useFocusManagement';
import { announce } from '@/utils/accessibility';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'full';
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  scrollable?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
  size = 'medium',
  showCloseButton = true,
  closeOnBackdrop = true,
  scrollable = false,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { firstElementRef, lastElementRef } = useFocusTrap(visible);
  const modalRef = useRef<View>(null);
  
  useEffect(() => {
    if (visible) {
      // Announce modal opening
      const message = title ? `${title} dialog opened` : 'Dialog opened';
      announce(message);
      
      // Set focus to modal
      if (modalRef.current) {
        const reactTag = modalRef.current as any;
        AccessibilityInfo.setAccessibilityFocus(reactTag);
      }
    }
  }, [visible, title]);
  
  const handleClose = () => {
    announce('Dialog closed');
    onClose();
  };
  
  const getModalSize = () => {
    switch (size) {
      case 'small':
        return { maxWidth: 320, maxHeight: '40%' };
      case 'medium':
        return { maxWidth: 400, maxHeight: '70%' };
      case 'large':
        return { maxWidth: 600, maxHeight: '90%' };
      case 'full':
        return { maxWidth: '100%', maxHeight: '100%', margin: 0 };
      default:
        return { maxWidth: 400, maxHeight: '70%' };
    }
  };
  
  const sizeStyles = getModalSize();
  
  const content = (
    <View
      ref={modalRef}
      style={[
        styles.modalContent,
        sizeStyles,
        { backgroundColor: theme.colors.surface },
      ]}
      accessible={true}
      accessibilityRole="dialog"
      accessibilityLabel={accessibilityLabel || title || 'Modal dialog'}
      accessibilityHint={accessibilityHint}
      accessibilityViewIsModal={true}
    >
      {(title || showCloseButton) && (
        <View 
          style={[styles.header, { borderBottomColor: theme.colors.borderLight }]}
          ref={firstElementRef}
        >
          {title && (
            <Text 
              style={[styles.title, { color: theme.colors.text }]}
              accessible={true}
              accessibilityRole="header"
            >
              {title}
            </Text>
          )}
          {showCloseButton && (
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              accessible={true}
              accessibilityLabel="Close dialog"
              accessibilityRole="button"
            >
              <Text style={[styles.closeButtonText, { color: theme.colors.textSecondary }]}>
                ✕
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {scrollable ? (
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.body}>
          {children}
        </View>
      )}
      
      {/* Focus trap anchor */}
      <View ref={lastElementRef} accessible={false} />
    </View>
  );
  
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback
        onPress={closeOnBackdrop ? handleClose : undefined}
        accessible={false}
      >
        <View style={[styles.backdrop, { paddingTop: insets.top }]}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardAvoid}
            >
              {content}
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  keyboardAvoid: {
    width: '100%',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    padding: 8,
    marginRight: -8,
  },
  closeButtonText: {
    fontSize: 20,
  },
  body: {
    padding: 20,
  },
  scrollContent: {
    paddingBottom: 20,
  },
});