const getBaseUrl = () => {
  return import.meta.env.VITE_API_URL || '/api';
};

const getLeadBaseUrl = () => {
  return import.meta.env.VITE_LEAD_API_URL || getBaseUrl();
};

export const API_CONFIG = {
  BASE_URL: getBaseUrl(),
  LEAD_BASE_URL: getLeadBaseUrl(),
  TIMEOUT: 30000,
  HEADERS: {
    'Content-Type': 'application/json',
  }
};
