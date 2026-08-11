import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { employeeApi } from '../api/employeeApi';

const EmployeeAuthContext = createContext(null);

export const EmployeeAuthProvider = ({ children }) => {
  const [employee, setEmployee] = useState(null);
  const [employeeToken, setEmployeeToken] = useState(localStorage.getItem('employeeToken') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeEmployeeAuth = async () => {
      if (employeeToken) {
        try {
          const data = await employeeApi.getMe();
          setEmployee(data.employee);
        } catch (error) {
          console.error('Employee authentication check failed:', error);
          employeeLogout();
        }
      }
      setLoading(false);
    };

    initializeEmployeeAuth();
  }, [employeeToken]);

  const employeeLogin = useCallback(async (email, password) => {
    try {
      const data = await employeeApi.login(email, password);
      const { token, employee: employeeData } = data;

      localStorage.setItem('employeeToken', token);
      localStorage.setItem('employee', JSON.stringify(employeeData));
      setEmployeeToken(token);
      setEmployee(employeeData);
      return { success: true };
    } catch (error) {
      console.error('Employee Login error:', error);
      let message = 'Invalid email or password.';
      if (!error.response) {
        message = 'Cannot reach the server. Please check if backend is running.';
      } else if (error.response.status === 502 || error.response.status === 503 || error.response.status === 504) {
        message = 'Backend server is not running or unreachable (502 Bad Gateway).';
      } else if (error.response.data?.message) {
        message = error.response.data.message;
      }
      return { success: false, error: message };
    }
  }, []);

  const employeeLogout = useCallback(() => {
    localStorage.removeItem('employeeToken');
    localStorage.removeItem('employee');
    setEmployeeToken('');
    setEmployee(null);
  }, []);

  const contextValue = useMemo(() => ({
    employee,
    employeeToken,
    loading,
    employeeLogin,
    employeeLogout,
    setEmployee
  }), [employee, employeeToken, loading, employeeLogin, employeeLogout]);

  return (
    <EmployeeAuthContext.Provider value={contextValue}>
      {children}
    </EmployeeAuthContext.Provider>
  );
};

export const useEmployeeAuth = () => {
  const context = useContext(EmployeeAuthContext);
  if (!context) {
    throw new Error('useEmployeeAuth must be used within an EmployeeAuthProvider');
  }
  return context;
};
