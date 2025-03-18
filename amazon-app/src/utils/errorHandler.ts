/**
 * Error handling utility for the Inventory Management System
 * Provides consistent error handling across the application
 */

import { createLogger } from './logger';

const logger = createLogger('ErrorHandler');

/**
 * Custom error types
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  API = 'API_ERROR',
  NETWORK = 'NETWORK_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR',
}

/**
 * Custom error class with additional context
 */
export class AppError extends Error {
  public type: ErrorType;
  public details?: Record<string, any>;
  public originalError?: Error;

  constructor(
    message: string, 
    type: ErrorType = ErrorType.INTERNAL, 
    details?: Record<string, any>, 
    originalError?: Error
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.details = details;
    this.originalError = originalError;
    
    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * Function to handle API errors
 */
export function handleApiError(error: any): AppError {
  logger.error('API error occurred:', error);
  
  // If it's already an AppError, just return it
  if (error instanceof AppError) {
    return error;
  }
  
  // Handle axios errors or fetch errors
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    const statusCode = error.response.status;
    const responseData = error.response.data;
    
    if (statusCode === 401) {
      return new AppError('Authentication failed', ErrorType.AUTHENTICATION, responseData, error);
    } else if (statusCode === 403) {
      return new AppError('Not authorized', ErrorType.AUTHORIZATION, responseData, error);
    } else if (statusCode === 400 || statusCode === 422) {
      return new AppError('Validation error', ErrorType.VALIDATION, responseData, error);
    } else if (statusCode >= 500) {
      return new AppError('Server error', ErrorType.API, responseData, error);
    }
    
    return new AppError(`API error: ${statusCode}`, ErrorType.API, responseData, error);
  } else if (error.request) {
    // The request was made but no response was received
    return new AppError('Network error: No response received', ErrorType.NETWORK, {}, error);
  } else if (error.message && typeof error.message === 'string' && error.message.includes('Network Error')) {
    return new AppError('Network error: Unable to connect to server', ErrorType.NETWORK, {}, error);
  }
  
  // Something else happened in setting up the request
  return new AppError(error.message || 'Unknown error', ErrorType.UNKNOWN, {}, error);
}

/**
 * Function to handle validation errors
 */
export function handleValidationError(fieldErrors: Record<string, string>): AppError {
  logger.error('Validation error occurred:', fieldErrors);
  return new AppError('Validation error', ErrorType.VALIDATION, { fieldErrors });
}

/**
 * Global error handler that can be used as a catch-all
 */
export function globalErrorHandler(error: Error | AppError): void {
  if (error instanceof AppError) {
    logger.error(`${error.type}: ${error.message}`, error.details);
  } else {
    logger.error('Unhandled error:', error);
  }
  
  // In production, you might want to report errors to a service like Sentry
  if (process.env.NODE_ENV === 'production') {
    // Example: Sentry.captureException(error);
    console.error('Error would be reported to monitoring service in production');
  }
} 