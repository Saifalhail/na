import React, { ReactNode, ReactElement } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@theme/ThemeContext';
import { Theme } from '@theme/index';

interface FormProps {
  children: ReactNode;
  scrollable?: boolean;
  keyboardAvoiding?: boolean;
  spacing?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export const Form: React.FC<FormProps> = ({
  children,
  scrollable = true,
  keyboardAvoiding = true,
  spacing = 'medium',
  style,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const formContent = (
    <View style={[styles.container, styles[`${spacing}Spacing`], style]}>
      {React.Children.map(children, (child, index) => (
        <View key={index} style={styles.fieldContainer}>
          {child}
        </View>
      ))}
    </View>
  );

  const content = scrollable ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.scrollContainer}
    >
      {formContent}
    </ScrollView>
  ) : (
    formContent
  );

  if (keyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return content;
};

interface FormSectionProps {
  title?: string;
  children: ReactNode;
  style?: ViewStyle;
}

export const FormSection: React.FC<FormSectionProps> = ({ title, children, style }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={[styles.section, style]}>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
};

interface FormFieldProps {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactElement;
  style?: ViewStyle;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  error,
  hint,
  children,
  style,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={[styles.field, style]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      {children}
      {error && <Text style={styles.error}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    keyboardAvoidingView: {
      flex: 1,
    },
    container: {
      flex: 1,
    },
    scrollContainer: {
      flexGrow: 1,
    },
    fieldContainer: {
      marginBottom: theme.spacing.m,
    },
    smallSpacing: {
      gap: theme.spacing.s,
    },
    mediumSpacing: {
      gap: theme.spacing.m,
    },
    largeSpacing: {
      gap: theme.spacing.l,
    },
    section: {
      marginBottom: theme.spacing.l,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.m,
    },
    sectionContent: {
      gap: theme.spacing.m,
    },
    field: {
      marginBottom: theme.spacing.m,
    },
    label: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: '600',
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xs,
    },
    required: {
      color: theme.colors.error[500],
    },
    error: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.error[500],
      marginTop: theme.spacing.xs,
    },
    hint: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.xs,
    },
  });

export default Form;
