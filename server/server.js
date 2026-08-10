const dns = require('dns');
try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
  }
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  // Ignore if restricted
}

const app = require('./app');
const connectDB = require('./config/db');
const { getRedisClient, closeRedis } = require('./config/redis');
const { initWorkers, stopAllWorkers } = require('./workers');
const { initScheduledJobs } = require('./queues/scheduledJobs');
const { closeQueues } = require('./queues/queueManager');

const PORT = process.env.PORT || 5000;
let serverInstance = null;

const start = async () => {
  try {
    // 1. Connect MongoDB
    await connectDB();

    // 2. Initialize Redis connection
    getRedisClient();

    // 3. Initialize BullMQ background workers
    initWorkers();

    // 4. Register BullMQ repeatable scheduled cron jobs
    await initScheduledJobs();

    serverInstance = app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`BullMQ Admin Dashboard available at: http://localhost:${PORT}/admin/queues`);
    });

    serverInstance.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Fatal: port ${PORT} is already in use. Stop the other process or change PORT in .env.`);
      } else {
        console.error(`Fatal: could not start server - ${err.message}`);
      }
      process.exit(1);
    });
  } catch (err) {
    console.error(`Fatal server start error - ${err.message}`);
    console.log('Restarting server after 5 seconds...');
    setTimeout(start, 5000);
  }
};

// Graceful Shutdown Handler
const gracefulShutdown = async (signal) => {
  console.log(`\n[Server] ${signal} signal received. Initiating graceful shutdown...`);

  try {
    // Stop accepting new HTTP requests
    if (serverInstance) {
      serverInstance.close(() => {
        console.log('[Server] HTTP server closed.');
      });
    }

    // Stop BullMQ workers
    await stopAllWorkers();

    // Close BullMQ queues
    await closeQueues();

    // Close Redis client
    await closeRedis();

    console.log('[Server] Graceful shutdown completed cleanly.');
    process.exit(0);
  } catch (err) {
    console.error('[Server Error] Error during graceful shutdown:', err.message);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Unhandled Rejection Error: ${err.message}`);
});

start();
