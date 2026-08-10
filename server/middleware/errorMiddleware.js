const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Catch Mongoose / MongoDB duplicate key errors (E11000)
  if (err.code === 11000 && err.keyValue) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const cleanField = field === 'studentId' ? 'Roll/Reg No' : field;
    const cleanMessage = `A student with this ${cleanField} ("${value}") already exists. Please provide a unique identifier.`;
    
    logger.warn(`${req.method} ${req.originalUrl} - 409 Conflict - ${cleanMessage}`);
    return res.status(409).json({
      success: false,
      message: cleanMessage,
      errors: [cleanMessage],
      timestamp: new Date().toISOString()
    });
  }

  // Catch Mongoose buffering timeout errors
  if (err.message && err.message.includes('buffering timed out')) {
    const cleanMessage = 'Database is currently unreachable. Please verify MongoDB Atlas IP Whitelist (allow 0.0.0.0/0) and MONGO_URI in environment variables.';
    logger.error(`${req.method} ${req.originalUrl} - 503 Service Unavailable - ${cleanMessage}`);
    return res.status(503).json({
      success: false,
      message: cleanMessage,
      errors: [cleanMessage],
      timestamp: new Date().toISOString()
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const errors = err.errors || [message];

  // Log error using production logger
  logger.error(`${req.method} ${req.originalUrl} - ${statusCode} - ${message}`, {
    stack: err.stack,
    errors
  });

  res.status(statusCode).json({
    success: false,
    message,
    errors: Array.isArray(errors) ? errors : [errors],
    timestamp: new Date().toISOString()
  });
};

module.exports = errorHandler;
