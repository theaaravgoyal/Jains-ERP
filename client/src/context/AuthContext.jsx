import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { authApi } from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async (reason = 'user_initiated', endpoint = null, status = null) => {
    console.log(`[AUTH] LOGOUT_TRIGGERED reason=${reason} endpoint=${endpoint} status=${status}`);
    try {
      if (token) {
        await authApi.logout();
      }
    } catch (error) {
      console.warn('Backend session cleanup skipped or offline:', error.message);
    } finally {
      localStorage.removeItem('token');
      setToken('');
      setUser(null);
    }
  }, [token]);

  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        try {
          const data = await authApi.getMe();
          setUser(data.user);
        } catch (error) {
          console.error('Auth verification failed:', error);
          // Only logout if it is an explicit 401 Unauthorized from the server
          if (error.response && error.response.status === 401) {
            logout('token_verification_failed_401', '/auth/me', 401);
          }
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [token, logout]);

  useEffect(() => {
    const handleUnauthorized = (e) => {
      logout('token_unauthorized_event', e.detail?.url, 401);
    };

    window.addEventListener('auth-unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth-unauthorized', handleUnauthorized);
    };
  }, [logout]);

  const login = useCallback(async (email, password) => {
    try {
      const data = await authApi.login(email, password);
      const { token: userToken, user: userData } = data;

      localStorage.setItem('token', userToken);
      setToken(userToken);
      setUser(userData);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      let message = 'Invalid email or password.';
      if (!error.response) {
        message = 'Network connection failed. Please check your internet connection and retry.';
      } else if (error.response.status === 502 || error.response.status === 503 || error.response.status === 504) {
        message = 'Backend server is not running or unreachable (502 Bad Gateway).';
      } else if (error.response.data?.message) {
        message = error.response.data.message;
      }
      return { success: false, error: message };
    }
  }, []);

  const contextValue = useMemo(() => ({ user, token, loading, login, logout }), [user, token, loading, login, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
