import React, { useState } from 'react';
import { borderRadius, rs } from '@/utils/responsive';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ViewStyle,
  ListRenderItem,
} from 'react-native';
import { useTheme } from '@theme/ThemeContext';
import { Theme } from '@theme/index';
import { TextInput } from './TextInput';
import { Button } from './Button';

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
  description?: string;
}

interface SelectProps {
  value?: string | number;
  onValueChange: (value: string | number) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  searchable?: boolean;
  maxHeight?: number;
  style?: ViewStyle;
  renderOption?: (option: SelectOption) => React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onValueChange,
  options,
  placeholder = 'Select an option',
  label,
  error,
  disabled = false,
  searchable = false,
  maxHeight = 300,
  style,
  renderOption,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel = selectedOption?.label || placeholder;

  const filteredOptions = searchable
    ? options.filter((option) => option.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  const handleSelectOption = (option: SelectOption) => {
    if (option.disabled) return;

    onValueChange(option.value);
    setModalVisible(false);
    setSearchQuery('');
  };

  const renderSelectOption: ListRenderItem<SelectOption> = ({ item }) => {
    const isSelected = item.value === value;

    if (renderOption) {
      return (
        <TouchableOpacity
          style={[styles.optionContainer, isSelected && styles.selectedOption]}
          onPress={() => handleSelectOption(item)}
          disabled={item.disabled}
        >
          {renderOption(item)}
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={[
          styles.optionContainer,
          isSelected && styles.selectedOption,
          item.disabled && styles.disabledOption,
        ]}
        onPress={() => handleSelectOption(item)}
        disabled={item.disabled}
      >
        <View style={styles.optionContent}>
          <Text
            style={[
              styles.optionLabel,
              isSelected && styles.selectedOptionLabel,
              item.disabled && styles.disabledOptionLabel,
            ]}
          >
            {item.label}
          </Text>
          {item.description && (
            <Text style={[styles.optionDescription, item.disabled && styles.disabledOptionLabel]}>
              {item.description}
            </Text>
          )}
        </View>
        {isSelected && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
    );
  };

  const renderModalContent = () => (
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>{label || 'Select Option'}</Text>
        <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      {searchable && (
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search options..."
          style={styles.searchInput}
        />
      )}

      <FlatList
        data={filteredOptions}
        renderItem={renderSelectOption}
        keyExtractor={(item) => item.value.toString()}
        style={[styles.optionsList, { maxHeight }]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <View style={styles.modalFooter}>
        <Button variant="outline" onPress={() => setModalVisible(false)}>
          <Text>Cancel</Text>
        </Button>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[
          styles.selectButton,
          disabled && styles.disabled,
          error ? styles.errorBorder : undefined,
        ]}
        onPress={() => setModalVisible(true)}
        disabled={disabled}
      >
        <Text style={[styles.selectButtonText, !selectedOption && styles.placeholderText]}>
          {selectedLabel}
        </Text>
        <Text style={[styles.arrow, modalVisible && styles.arrowUp]}>▼</Text>
      </TouchableOpacity>

      {error && <Text style={styles.error}>{error}</Text>}

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>{renderModalContent()}</View>
        </View>
      </Modal>
    </View>
  );
};

interface MultiSelectProps extends Omit<SelectProps, 'value' | 'onValueChange' | 'multiple'> {
  value: (string | number)[];
  onValueChange: (values: (string | number)[]) => void;
  maxSelections?: number;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  value,
  onValueChange,
  maxSelections,
  ...props
}) => {
  const handleValueChange = (optionValue: string | number) => {
    const currentValues = value || [];
    const isSelected = currentValues.includes(optionValue);

    if (isSelected) {
      onValueChange(currentValues.filter((v) => v !== optionValue));
    } else {
      if (maxSelections && currentValues.length >= maxSelections) {
        return;
      }
      onValueChange([...currentValues, optionValue]);
    }
  };

  return (
    <Select
      {...props}
      value={value[0]} // For display purposes
      onValueChange={handleValueChange}
    />
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginVertical: theme.spacing.xs,
    },
    label: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: '600',
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xs,
    },
    selectButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.m,
      paddingVertical: theme.spacing.s,
      borderWidth: 1,
      borderColor: theme.colors.neutral[300],
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.surface,
      minHeight: 48,
    },
    selectButtonText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      flex: 1,
    },
    placeholderText: {
      color: theme.colors.text.secondary,
    },
    arrow: {
      fontSize: 12,
      color: theme.colors.text.secondary,
      marginLeft: theme.spacing.s,
    },
    arrowUp: {
      transform: [{ rotate: '180deg' }],
    },
    disabled: {
      opacity: 0.5,
    },
    errorBorder: {
      borderColor: theme.colors.error[500],
    },
    error: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.error[500],
      marginTop: theme.spacing.xs,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      maxWidth: '90%',
      maxHeight: '80%',
      width: '100%',
      ...theme.shadows.lg,
    },
    modalContent: {
      flex: 1,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.m,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.neutral[300],
    },
    modalTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
    },
    closeButton: {
      padding: theme.spacing.xs,
    },
    closeButtonText: {
      fontSize: 18,
      color: theme.colors.text.secondary,
    },
    searchInput: {
      margin: theme.spacing.m,
      marginBottom: theme.spacing.s,
    },
    optionsList: {
      flex: 1,
    },
    optionContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.m,
      paddingVertical: theme.spacing.s,
      minHeight: 48,
    },
    selectedOption: {
      backgroundColor: theme.colors.primary[50],
    },
    disabledOption: {
      opacity: 0.5,
    },
    optionContent: {
      flex: 1,
    },
    optionLabel: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
    },
    selectedOptionLabel: {
      color: theme.colors.primary[500],
      fontWeight: '600',
    },
    disabledOptionLabel: {
      color: theme.colors.text.secondary,
    },
    optionDescription: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.xs,
    },
    checkmark: {
      fontSize: 16,
      color: theme.colors.primary[500],
      fontWeight: 'bold',
    },
    separator: {
      height: 1,
      backgroundColor: theme.colors.neutral[300],
      marginHorizontal: theme.spacing.m,
    },
    modalFooter: {
      padding: theme.spacing.m,
      borderTopWidth: 1,
      borderTopColor: theme.colors.neutral[300],
    },
  });

export default Select;
