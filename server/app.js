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
app.use(cors({
  origin: (origin, callback) => {
    // Allow all origins (Vercel, local network, mobile apps, Postman)
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));
app.options('*', cors());

const securityHeaders = require('./middleware/securityHeadersMiddleware');
const rateLimiter = require('./middleware/rateLimitMiddleware');
const nosqlSanitizer = require('./middleware/nosqlInjectionMiddleware');

app.use(securityHeaders);
app.use(rateLimiter(15 * 60 * 1000, 150)); // sliding window rate-limiting
app.use(nosqlSanitizer); // prevent nosql query injection attacks

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// HTTP Request Logger Middleware
app.use(loggerMiddleware);

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'ERP Portal server is healthy and running.' });
});
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'ERP Portal server is healthy and running.' });
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
