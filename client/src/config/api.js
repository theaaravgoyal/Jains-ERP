const getBaseUrl = () => {
  return import.meta.env.VITE_API_URL || '/api';
};

export const API_CONFIG = {
  BASE_URL: getBaseUrl(),
  TIMEOUT: 30000,
  HEADERS: {
    'Content-Type': 'application/json',
  }
};
