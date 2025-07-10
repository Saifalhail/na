import { useState, useCallback } from 'react';

export interface ValidationRule {
  validate: (value: any) => boolean;
  message: string;
}

export interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  email?: boolean;
  numeric?: boolean;
  custom?: ValidationRule[];
}

export const useValidation = (rules?: ValidationRules) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validate = useCallback(
    (name: string, value: any): string | null => {
      if (!rules) return null;

      // Required validation
      if (rules.required && !value) {
        return 'This field is required';
      }

      // String validations
      if (typeof value === 'string') {
        // Min length
        if (rules.minLength && value.length < rules.minLength) {
          return `Must be at least ${rules.minLength} characters`;
        }

        // Max length
        if (rules.maxLength && value.length > rules.maxLength) {
          return `Must be no more than ${rules.maxLength} characters`;
        }

        // Email validation
        if (rules.email) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            return 'Please enter a valid email address';
          }
        }

        // Pattern validation
        if (rules.pattern && !rules.pattern.test(value)) {
          return 'Invalid format';
        }
      }

      // Numeric validation
      if (rules.numeric) {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          return 'Must be a number';
        }
      }

      // Custom validations
      if (rules.custom) {
        for (const rule of rules.custom) {
          if (!rule.validate(value)) {
            return rule.message;
          }
        }
      }

      return null;
    },
    [rules]
  );

  const validateField = useCallback(
    (name: string, value: any) => {
      const error = validate(name, value);

      setErrors((prev) => ({
        ...prev,
        [name]: error || '',
      }));

      return !error;
    },
    [validate]
  );

  const validateAll = useCallback(
    (values: Record<string, any>) => {
      const newErrors: Record<string, string> = {};
      let isValid = true;

      Object.entries(values).forEach(([name, value]) => {
        const error = validate(name, value);
        if (error) {
          newErrors[name] = error;
          isValid = false;
        }
      });

      setErrors(newErrors);
      return isValid;
    },
    [validate]
  );

  const setFieldTouched = useCallback((name: string, isTouched = true) => {
    setTouched((prev) => ({
      ...prev,
      [name]: isTouched,
    }));
  }, []);

  const resetValidation = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  const getFieldError = useCallback(
    (name: string) => {
      return touched[name] ? errors[name] : undefined;
    },
    [errors, touched]
  );

  return {
    errors,
    touched,
    validateField,
    validateAll,
    setFieldTouched,
    resetValidation,
    getFieldError,
  };
};

// Common validation rules
export const commonRules = {
  email: {
    required: true,
    email: true,
  } as ValidationRules,

  password: {
    required: true,
    minLength: 8,
    custom: [
      {
        validate: (value: string) => /[A-Z]/.test(value),
        message: 'Password must contain at least one uppercase letter',
      },
      {
        validate: (value: string) => /[a-z]/.test(value),
        message: 'Password must contain at least one lowercase letter',
      },
      {
        validate: (value: string) => /[0-9]/.test(value),
        message: 'Password must contain at least one number',
      },
    ],
  } as ValidationRules,

  phoneNumber: {
    required: true,
    pattern: /^\+?[\d\s-()]+$/,
    minLength: 10,
    maxLength: 20,
  } as ValidationRules,

  numeric: {
    required: true,
    numeric: true,
  } as ValidationRules,
};
