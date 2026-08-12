import axios from 'axios';
import { API_CONFIG } from '../config/api';

const axiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.HEADERS
});

// Cache map for in-flight GET requests to prevent duplicate network hits
const inFlightRequests = new Map();

/**
 * Format human-readable error messages based on HTTP status code
 */
export const classifyApiError = (error) => {
  if (!error) return 'An unexpected error occurred.';

  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return 'Request timed out. Please check your network connection.';
    }
    return 'Unable to connect to the ERP server. Please verify your connection.';
  }

  const status = error.response.status;
  const serverMsg = error.response.data?.message;

  switch (status) {
    case 429: {
      const retryAfter = error.response.headers?.['retry-after'];
      return serverMsg || (retryAfter 
        ? `Too many requests. Please wait ${retryAfter} seconds and try again.` 
        : 'Too many requests. Please wait a moment and try again.');
    }
    case 401:
      return serverMsg || 'Session expired. Please log in again.';
    case 403:
      return serverMsg || 'You do not have permission to perform this action.';
    case 404:
      return serverMsg || 'Requested resource not found.';
    case 502:
    case 503:
    case 504:
      return 'ERP server is temporarily unavailable. Please try again shortly.';
    case 500:
      return serverMsg || 'Internal server error. Please try again later.';
    default:
      return serverMsg || error.message || 'Request failed. Please try again.';
  }
};

// Request Interceptor: Attach JWT Token automatically
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Deduplicate identical in-flight GET requests
    if (config.method === 'get' && !config.skipDeduplication) {
      const requestKey = `${config.baseURL || ''}${config.url}?${JSON.stringify(config.params || {})}`;
      if (inFlightRequests.has(requestKey)) {
        config.adapter = () => inFlightRequests.get(requestKey);
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Catch Token Expiries, Deduplication Cleanup & Error Formatting
axiosInstance.interceptors.response.use(
  (response) => {
    // Clear completed GET request from in-flight cache
    if (response.config?.method === 'get') {
      const requestKey = `${response.config.baseURL || ''}${response.config.url}?${JSON.stringify(response.config.params || {})}`;
      inFlightRequests.delete(requestKey);
    }
    return response;
  },
  (error) => {
    if (error.config?.method === 'get') {
      const requestKey = `${error.config.baseURL || ''}${error.config.url}?${JSON.stringify(error.config.params || {})}`;
      inFlightRequests.delete(requestKey);
    }

    // Attach categorized user message
    error.userMessage = classifyApiError(error);

    if (error.response && error.response.status === 401) {
      console.warn('Unauthorized request - session expired.');
      // Only clear if on an authenticated user path, not a public login attempt
      if (!error.config?.url?.includes('/auth/login')) {
        localStorage.removeItem('token');
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;

