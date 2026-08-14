import axios from 'axios';
import { API_CONFIG } from '../config/api';
import { classifyApiError } from './axios';

const employeeAxios = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.HEADERS
});

// Cache map for in-flight GET requests
const inFlightEmployeeRequests = new Map();

// Request Interceptor: Attach Employee Token automatically
employeeAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('employeeToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (config.method === 'get' && !config.skipDeduplication) {
      const requestKey = `${config.baseURL || ''}${config.url}?${JSON.stringify(config.params || {})}`;
      if (inFlightEmployeeRequests.has(requestKey)) {
        config.adapter = () => inFlightEmployeeRequests.get(requestKey);
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Catch Token Expiries / Deduplication / Error Categorization
employeeAxios.interceptors.response.use(
  (response) => {
    if (response.config?.method === 'get') {
      const requestKey = `${response.config.baseURL || ''}${response.config.url}?${JSON.stringify(response.config.params || {})}`;
      inFlightEmployeeRequests.delete(requestKey);
    }
    return response;
  },
  (error) => {
    if (error.config?.method === 'get') {
      const requestKey = `${error.config.baseURL || ''}${error.config.url}?${JSON.stringify(error.config.params || {})}`;
      inFlightEmployeeRequests.delete(requestKey);
    }

    error.userMessage = classifyApiError(error);

    if (error.response && error.response.status === 401) {
      console.warn('Unauthorized employee request - session expired.');
      if (!error.config?.url?.includes('/employee/login')) {
        localStorage.removeItem('employeeToken');
        localStorage.removeItem('employee');
        window.dispatchEvent(new CustomEvent('employee-unauthorized', {
          detail: { url: error.config?.url }
        }));
      }
    }
    return Promise.reject(error);
  }
);

export default employeeAxios;

