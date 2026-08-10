const getBaseUrl = () => {
  // In development, Vite dev proxy handles '/api' -> 'http://localhost:5000'.
  // In production (Vercel), Vercel rewrites proxy '/api' -> 'https://erp-portal-production-0cc1.up.railway.app/api'.
  // Using a relative path eliminates browser DNS resolution of Railway domain on mobile/5G networks.
  return import.meta.env.VITE_API_URL || '/api';
};

export const API_CONFIG = {
  BASE_URL: getBaseUrl(),
  TIMEOUT: 30000,
  HEADERS: {
    'Content-Type': 'application/json',
  }
};
