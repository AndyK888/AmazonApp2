/**
 * Logger utility for the Inventory Management System
 * Provides consistent logging across the application
 */

// Define log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// Environment configuration - can be set through environment variables
const DEFAULT_LOG_LEVEL = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
const CURRENT_LOG_LEVEL = parseInt(process.env.REACT_APP_LOG_LEVEL || DEFAULT_LOG_LEVEL.toString());

// Styling for different log levels in the console
const LOG_STYLES = {
  [LogLevel.DEBUG]: 'color: #6c757d',
  [LogLevel.INFO]: 'color: #0d6efd',
  [LogLevel.WARN]: 'color: #ffc107; font-weight: bold',
  [LogLevel.ERROR]: 'color: #dc3545; font-weight: bold',
};

/**
 * Main logger class
 */
class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  /**
   * Format log message with timestamp and context
   */
  private formatMessage(message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${this.context}] ${message}`;
  }

  /**
   * Check if the provided log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return level >= CURRENT_LOG_LEVEL;
  }

  /**
   * Log a debug message
   */
  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(`%c${this.formatMessage(message)}`, LOG_STYLES[LogLevel.DEBUG], ...args);
    }
  }

  /**
   * Log an info message
   */
  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(`%c${this.formatMessage(message)}`, LOG_STYLES[LogLevel.INFO], ...args);
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(`%c${this.formatMessage(message)}`, LOG_STYLES[LogLevel.WARN], ...args);
    }
  }

  /**
   * Log an error message
   */
  error(message: string | Error, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorMessage = message instanceof Error ? message.message : message;
      console.error(`%c${this.formatMessage(errorMessage)}`, LOG_STYLES[LogLevel.ERROR], ...args);
      
      // If it's an Error object, log the stack trace
      if (message instanceof Error && message.stack) {
        console.error(`%c${this.formatMessage('Stack trace:')}`, LOG_STYLES[LogLevel.ERROR], message.stack);
      }
    }
  }
}

/**
 * Create a logger instance for a specific context
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

// Create a default logger for general use
export const logger = createLogger('App'); 