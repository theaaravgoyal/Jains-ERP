import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import ProtectedLayout from './components/ProtectedLayout';
import { ROUTES } from './constants/Routes';
import { PERMISSIONS } from './constants/Permissions';

// Lazy Loaded Pages & Modules
const Login = lazy(() => import('./pages/Login/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const Modules = lazy(() => import('./pages/Modules/Modules'));
const Settings = lazy(() => import('./pages/Settings/Settings'));
const Attendance = lazy(() => import('./Modules/Attendance/pages/Attendance'));
const FeesManagement = lazy(() => import('./Modules/FeesManagement/pages/FeesManagement'));
const LeadDashboard = lazy(() => import('./Modules/LeadManagement/pages/LeadDashboard'));
const CertificateManagement = lazy(() => import('./Modules/CertificateManagement/pages/CertificateManagement'));
const VerifyCertificate = lazy(() => import('./pages/CertificateVerification/VerifyCertificate'));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));
const Notifications = lazy(() => import('./pages/Notifications/Notifications'));

// Employee Attendance Standalone Pages
const EmployeeSplash = lazy(() => import('./pages/EmployeeAttendance/EmployeeSplash'));
const EmployeeLogin = lazy(() => import('./pages/EmployeeAttendance/EmployeeLogin'));
const EmployeeRegister = lazy(() => import('./pages/EmployeeAttendance/EmployeeRegister'));
const EmployeeDashboard = lazy(() => import('./pages/EmployeeAttendance/EmployeeDashboard'));

const FallbackLoading = () => (
  <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 font-sans">
    <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-red-600 animate-spin mb-4" />
    <p className="text-sm font-semibold text-slate-500">Loading Dashboard Modules...</p>
  </div>
);

function App() {
  return (
    <Suspense fallback={<FallbackLoading />}>
      <Routes>
        {/* Public Routes */}
        <Route path={ROUTES.LOGIN} element={<Login />} />
        <Route path={ROUTES.VERIFY_CERTIFICATE} element={<VerifyCertificate />} />

        {/* Employee Attendance Standalone Routes */}
        <Route path={ROUTES.EMPLOYEE_SPLASH} element={<EmployeeSplash />} />
        <Route path="/employee/" element={<EmployeeSplash />} />
        <Route path={ROUTES.EMPLOYEE_LOGIN} element={<EmployeeLogin />} />
        <Route path="/employee/login/" element={<EmployeeLogin />} />
        <Route path={ROUTES.EMPLOYEE_REGISTER} element={<EmployeeRegister />} />
        <Route path="/employee/register/" element={<EmployeeRegister />} />
        <Route path={ROUTES.EMPLOYEE_DASHBOARD} element={<EmployeeDashboard />} />
        <Route path="/employee/dashboard/" element={<EmployeeDashboard />} />

        {/* Core Navigation Routes */}
        <Route
          path={ROUTES.DASHBOARD}
          element={
            <ProtectedRoute>
              <ProtectedLayout>
                <Dashboard />
              </ProtectedLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path={ROUTES.MODULES}
          element={
            <ProtectedRoute>
              <ProtectedLayout>
                <Modules />
              </ProtectedLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path={ROUTES.SETTINGS}
          element={
            <ProtectedRoute>
              <ProtectedLayout>
                <Settings />
              </ProtectedLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path={ROUTES.NOTIFICATIONS}
          element={
            <ProtectedRoute>
              <ProtectedLayout>
                <Notifications />
              </ProtectedLayout>
            </ProtectedRoute>
          }
        />

        {/* Module Routes — permission-gated */}
        <Route
          path={ROUTES.ATTENDANCE}
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.ACCESS_ATTENDANCE}>
              <ProtectedLayout>
                <Attendance />
              </ProtectedLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path={ROUTES.FEES_MANAGEMENT}
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.ACCESS_FEES}>
              <ProtectedLayout>
                <FeesManagement />
              </ProtectedLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path={ROUTES.LEAD_MANAGEMENT}
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.ACCESS_LEADS}>
              <ProtectedLayout>
                <LeadDashboard />
              </ProtectedLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path={ROUTES.CERTIFICATE_MANAGEMENT}
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.ACCESS_CERTIFICATES}>
              <ProtectedLayout>
                <CertificateManagement />
              </ProtectedLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path={ROUTES.UNAUTHORIZED}
          element={
            <ProtectedRoute>
              <ProtectedLayout>
                <Unauthorized />
              </ProtectedLayout>
            </ProtectedRoute>
          }
        />

        {/* Default Redirections */}
        <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
