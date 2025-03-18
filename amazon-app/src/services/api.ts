/**
 * API service for the Inventory Management System
 * Handles all API requests with proper error handling
 */

import axios, { 
  AxiosInstance, 
  AxiosRequestConfig, 
  AxiosResponse, 
  AxiosError,
  InternalAxiosRequestConfig
} from 'axios';
import { handleApiError, AppError } from '../utils/errorHandler';
import { createLogger } from '../utils/logger';

const logger = createLogger('ApiService');

// Default configuration
const DEFAULT_CONFIG: AxiosRequestConfig = {
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * API Service class for handling HTTP requests
 */
class ApiService {
  private api: AxiosInstance;

  constructor(config: AxiosRequestConfig = {}) {
    this.api = axios.create({
      ...DEFAULT_CONFIG,
      ...config,
    });

    // Request interceptor
    this.api.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        logger.debug(`Request: ${config.method?.toUpperCase()} ${config.url}`, { 
          params: config.params,
          data: config.data 
        });
        
        // Add auth token if available
        const token = localStorage.getItem('authToken');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        return config;
      },
      (error: AxiosError) => {
        logger.error('Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        logger.debug(`Response: ${response.status} from ${response.config.url}`, {
          data: response.data,
        });
        return response;
      },
      (error: AxiosError) => {
        const apiError = handleApiError(error);
        return Promise.reject(apiError);
      }
    );
  }

  /**
   * Generic request method
   */
  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.api.request<T>(config);
      return response.data;
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }
      throw handleApiError(error);
    }
  }

  /**
   * GET request
   */
  async get<T>(url: string, params?: Record<string, unknown>, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({
      method: 'get',
      url,
      params,
      ...config,
    });
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({
      method: 'post',
      url,
      data,
      ...config,
    });
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({
      method: 'put',
      url,
      data,
      ...config,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({
      method: 'patch',
      url,
      data,
      ...config,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({
      method: 'delete',
      url,
      ...config,
    });
  }
}

// Export a singleton instance
export const apiService = new ApiService();

// Also export the class for testing or custom instances
export default ApiService; 