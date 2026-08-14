const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const compression = require('compression');
const loggerMiddleware = require('./middleware/loggerMiddleware');
const errorMiddleware = require('./middleware/errorMiddleware');

// Load environment variables
dotenv.config();

const app = express();
app.set('trust proxy', true);

// Middlewares
app.use(compression());

const configuredFrontend = process.env.FRONTEND_URL || process.env.CLIENT_URL;

const allowedOrigins = [
  'https://erp-portal-pi.vercel.app',
  'https://jainsworkspace.com',
  'https://www.jainsworkspace.com',
  'https://api.jainsworkspace.com',
  'https://cms.jainscomputer.com',
  'https://api.jainscomputer.com',
  'https://erp.jainscomputer.com',
  'https://jainscomputer.com',
  'https://www.jainscomputer.com',
  'https://attendance-app-xi-sand.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

if (configuredFrontend && !allowedOrigins.includes(configuredFrontend)) {
  allowedOrigins.push(configuredFrontend);
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser callers (curl, mobile, webhooks, server-to-server)
    if (!origin) return callback(null, true);

    try {
      const parsedUrl = new URL(origin);
      const hostname = parsedUrl.hostname;

      if (
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes(parsedUrl.origin) ||
        hostname.endsWith('.vercel.app') ||
        hostname.endsWith('.jainscomputer.com') ||
        hostname.endsWith('.jainsworkspace.com') ||
        hostname === 'localhost' ||
        hostname === '127.0.0.1'
      ) {
        return callback(null, true);
      }
    } catch (e) {
      // Invalid URL format
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  maxAge: 86400 // Cache preflight OPTIONS responses for 24h to cut preflight HTTP traffic
};

app.use(cors(corsOptions));

const securityHeaders = require('./middleware/securityHeadersMiddleware');
const nosqlSanitizer = require('./middleware/nosqlInjectionMiddleware');

app.use(securityHeaders);
app.use(nosqlSanitizer); // prevent nosql query injection attacks

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// HTTP Request Logger Middleware
app.use(loggerMiddleware);

const fs = require('fs');

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static uploads
app.use('/uploads', express.static(uploadsDir));
app.use('/api/uploads', express.static(uploadsDir));

// Root Route
app.get('/', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Welcome to the ERP Portal API. Server is running successfully.',
    healthCheck: '/api/health'
  });
});

// Root API Route
app.get('/api', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Welcome to the ERP Portal API.',
    healthCheck: '/api/health'
  });
});

const mongoose = require('mongoose');
const { getLastDbError } = require('./config/db');

// Health Check Route
app.get('/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(isDbConnected ? 200 : 503).json({
    success: isDbConnected,
    message: isDbConnected ? 'ERP Portal server is healthy and connected to database.' : 'Server is running but MongoDB is not connected.',
    database: isDbConnected ? 'connected' : 'disconnected',
    dbError: getLastDbError(),
    mongoConfigured: true,
    uptime: Math.floor(process.uptime())
  });
});
app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(isDbConnected ? 200 : 503).json({
    success: isDbConnected,
    message: isDbConnected ? 'ERP Portal server is healthy and connected to database.' : 'Server is running but MongoDB is not connected.',
    database: isDbConnected ? 'connected' : 'disconnected',
    dbError: getLastDbError(),
    mongoConfigured: true,
    uptime: Math.floor(process.uptime())
  });
});

// Database connection validation middleware for API requests
app.use('/api', (req, res, next) => {
  if (req.path === '/health' || req.path.startsWith('/uploads')) {
    return next();
  }
  
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database is currently offline. Service Temporarily Unavailable.',
      errors: ['Database connection is not active.']
    });
  }
  next();
});

// Bull-Board Web UI Monitoring Dashboard
const { serverAdapter } = require('./config/bullBoard');
app.use('/admin/queues', serverAdapter.getRouter());
app.use('/api/admin/queues', serverAdapter.getRouter());

// Register Routes both with and without '/api' prefix to be resilient to client config issues
const routes = [
  { path: '/auth', router: require('./routes/authRoutes') },
  { path: '/lead', router: require('./routes/leadRoutes') },
  { path: '/students', router: require('./routes/studentRoutes') },
  { path: '/fee-plan', router: require('./routes/feePlanRoutes') },
  { path: '/installments', router: require('./routes/installmentRoutes') },
  { path: '/payments', router: require('./routes/paymentRoutes') },
  { path: '/fees-dashboard', router: require('./routes/dashboardRoutes') },
  { path: '/reports', router: require('./routes/reportRoutes') },
  { path: '/invoices', router: require('./routes/invoiceRoutes') },
  { path: '/receipts', router: require('./routes/receiptRoutes') },
  { path: '/settings', router: require('./routes/settingsRoutes') },
  { path: '/notifications', router: require('./routes/notificationRoutes') },
  { path: '/queues', router: require('./routes/queueRoutes') },
  { path: '/employee', router: require('./routes/employee/employeeRoutes') },
  { path: '/employee/leaves', router: require('./routes/employee/leaveRoutes') },
  { path: '/admin', router: require('./routes/admin/adminRoutes') },
  { path: '/admin/leaves', router: require('./routes/admin/leaveRoutes') },
  { path: '/attendance', router: require('./routes/attendance/attendanceRoutes') },
  { path: '/certificates', router: require('./routes/certificate/certificateRoutes') }
];

routes.forEach(route => {
  app.use(route.path, route.router);
  app.use(`/api${route.path}`, route.router);
});

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'Resource not found' });
});

// Global Error Handler Middleware (Clean Architecture)
app.use(errorMiddleware);

module.exports = app;
