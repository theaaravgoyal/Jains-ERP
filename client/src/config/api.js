const getBaseUrl = () => {
  return import.meta.env.VITE_API_URL || 'https://erp-portal-production-0cc1.up.railway.app/api';
};

export const API_CONFIG = {
  BASE_URL: getBaseUrl(),
  TIMEOUT: 30000,
  HEADERS: {
    'Content-Type': 'application/json',
  }
};
