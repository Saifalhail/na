import { ErrorResponse } from '@types/api';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
  
  static fromResponse(response: ErrorResponse, statusCode: number): ApiError {
    return new ApiError(
      statusCode,
      response.code || 'UNKNOWN_ERROR',
      response.message || 'An unexpected error occurred',
      response.details
    );
  }
  
  isAuthError(): boolean {
    return this.statusCode === 401 || this.statusCode === 403;
  }
  
  isValidationError(): boolean {
    return this.statusCode === 400 && this.errorCode === 'VALIDATION_ERROR';
  }
  
  isRateLimitError(): boolean {
    return this.statusCode === 429;
  }
  
  isServerError(): boolean {
    return this.statusCode >= 500;
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network connection failed') {
    super(message);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

export class ValidationError extends ApiError {
  constructor(public fields: Record<string, string[]>) {
    super(400, 'VALIDATION_ERROR', 'Validation failed', fields);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
  
  getFieldErrors(): Record<string, string> {
    const errors: Record<string, string> = {};
    
    for (const [field, messages] of Object.entries(this.fields)) {
      errors[field] = messages[0] || 'Invalid value';
    }
    
    return errors;
  }
  
  getFirstError(): string {
    const firstField = Object.keys(this.fields)[0];
    if (firstField && this.fields[firstField].length > 0) {
      return this.fields[firstField][0];
    }
    return 'Validation failed';
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication failed') {
    super(401, 'AUTHENTICATION_ERROR', message);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = 'You do not have permission to perform this action') {
    super(403, 'AUTHORIZATION_ERROR', message);
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource') {
    super(404, 'NOT_FOUND', `${resource} not found`);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class RateLimitError extends ApiError {
  constructor(
    public retryAfter?: number,
    message: string = 'Too many requests. Please try again later.'
  ) {
    super(429, 'RATE_LIMIT_EXCEEDED', message, { retryAfter });
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export class ServerError extends ApiError {
  constructor(message: string = 'Internal server error occurred') {
    super(500, 'SERVER_ERROR', message);
    Object.setPrototypeOf(this, ServerError.prototype);
  }
}

export const handleApiError = (error: any): never => {
  // Network error (no response)
  if (error.message === 'Network Error' || !error.response) {
    throw new NetworkError();
  }
  
  const { status, data } = error.response;
  
  // Validation error with field errors
  if (status === 400 && data.errors) {
    throw new ValidationError(data.errors);
  }
  
  // Authentication error
  if (status === 401) {
    throw new AuthenticationError(data.message);
  }
  
  // Authorization error
  if (status === 403) {
    throw new AuthorizationError(data.message);
  }
  
  // Not found error
  if (status === 404) {
    throw new NotFoundError();
  }
  
  // Rate limit error
  if (status === 429) {
    const retryAfter = error.response.headers['retry-after'];
    throw new RateLimitError(retryAfter ? parseInt(retryAfter, 10) : undefined, data.message);
  }
  
  // Server error
  if (status >= 500) {
    throw new ServerError(data.message);
  }
  
  // Generic API error
  throw ApiError.fromResponse(data, status);
};