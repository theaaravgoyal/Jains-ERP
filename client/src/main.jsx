import React from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { EmployeeAuthProvider } from './context/EmployeeAuthContext';
import { PermissionProvider } from './context/PermissionContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import './index.css';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <EmployeeAuthProvider>
          <PermissionProvider>
            <ThemeProvider>
              <NotificationProvider>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </NotificationProvider>
            </ThemeProvider>
          </PermissionProvider>
        </EmployeeAuthProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
