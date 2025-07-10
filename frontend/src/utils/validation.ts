import { VALIDATION_CONFIG } from '@/constants';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateEmail = (email: string): ValidationResult => {
  if (!email.trim()) {
    return { isValid: false, error: 'Email is required' };
  }
  
  if (!VALIDATION_CONFIG.EMAIL_REGEX.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  return { isValid: true };
};

export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (password.length < VALIDATION_CONFIG.PASSWORD_MIN_LENGTH) {
    return { 
      isValid: false, 
      error: `Password must be at least ${VALIDATION_CONFIG.PASSWORD_MIN_LENGTH} characters` 
    };
  }
  
  if (!VALIDATION_CONFIG.PASSWORD_REGEX.test(password)) {
    return { 
      isValid: false, 
      error: 'Password must contain uppercase, lowercase, number, and special character' 
    };
  }
  
  return { isValid: true };
};

export const validateConfirmPassword = (password: string, confirmPassword: string): ValidationResult => {
  if (!confirmPassword) {
    return { isValid: false, error: 'Please confirm your password' };
  }
  
  if (password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match' };
  }
  
  return { isValid: true };
};

export const validateName = (name: string): ValidationResult => {
  if (!name.trim()) {
    return { isValid: false, error: 'Name is required' };
  }
  
  if (name.length < VALIDATION_CONFIG.NAME_MIN_LENGTH) {
    return { 
      isValid: false, 
      error: `Name must be at least ${VALIDATION_CONFIG.NAME_MIN_LENGTH} characters` 
    };
  }
  
  if (name.length > VALIDATION_CONFIG.NAME_MAX_LENGTH) {
    return { 
      isValid: false, 
      error: `Name must be less than ${VALIDATION_CONFIG.NAME_MAX_LENGTH} characters` 
    };
  }
  
  return { isValid: true };
};

export const validateUsername = (username: string): ValidationResult => {
  if (!username.trim()) {
    return { isValid: false, error: 'Username is required' };
  }
  
  if (username.length < VALIDATION_CONFIG.USERNAME_MIN_LENGTH) {
    return { 
      isValid: false, 
      error: `Username must be at least ${VALIDATION_CONFIG.USERNAME_MIN_LENGTH} characters` 
    };
  }
  
  if (username.length > VALIDATION_CONFIG.USERNAME_MAX_LENGTH) {
    return { 
      isValid: false, 
      error: `Username must be less than ${VALIDATION_CONFIG.USERNAME_MAX_LENGTH} characters` 
    };
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { 
      isValid: false, 
      error: 'Username can only contain letters, numbers, and underscores' 
    };
  }
  
  return { isValid: true };
};

export const validateAge = (age: number): ValidationResult => {
  if (!age) {
    return { isValid: false, error: 'Age is required' };
  }
  
  if (age < 13 || age > 120) {
    return { isValid: false, error: 'Age must be between 13 and 120' };
  }
  
  return { isValid: true };
};

export const validateWeight = (weight: number): ValidationResult => {
  if (!weight) {
    return { isValid: false, error: 'Weight is required' };
  }
  
  if (weight < 30 || weight > 300) {
    return { isValid: false, error: 'Weight must be between 30 and 300 kg' };
  }
  
  return { isValid: true };
};

export const validateHeight = (height: number): ValidationResult => {
  if (!height) {
    return { isValid: false, error: 'Height is required' };
  }
  
  if (height < 100 || height > 250) {
    return { isValid: false, error: 'Height must be between 100 and 250 cm' };
  }
  
  return { isValid: true };
};

export const validateRequired = (value: string, fieldName: string): ValidationResult => {
  if (!value || !value.trim()) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  return { isValid: true };
};