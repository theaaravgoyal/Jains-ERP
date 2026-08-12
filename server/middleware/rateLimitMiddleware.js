// In-memory sliding-window request store
const ipRequestStore = new Map();

// Periodic cleanup of expired rate limit entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, records] of ipRequestStore.entries()) {
    const active = records.filter((item) => now - item.time < item.windowMs);
    if (active.length === 0) {
      ipRequestStore.delete(ip);
    } else {
      ipRequestStore.set(ip, active);
    }
  }
}, 5 * 60 * 1000).unref();

/**
 * Extract real client IP reliably behind reverse proxies (Cloudflare, Vercel, Railway)
 */
const getClientIp = (req) => {
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp) return cfIp.trim();

  const xRealIp = req.headers['x-real-ip'];
  if (xRealIp) return xRealIp.trim();

  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(',')[0];
    if (firstIp) return firstIp.trim();
  }

  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
};

/**
 * Tiered sliding-window Rate Limiter Middleware
 * 
 * @param {Object} options
 * @param {number} options.windowMs - Time window in ms (default 15 minutes)
 * @param {number} options.maxRequests - Max requests permitted in window (default 1500 for general API)
 * @param {string} options.message - Custom error message for HTTP 429
 * @param {Function} options.skip - Function(req) returning true to bypass rate limit
 */
const rateLimiter = (options = {}) => {
  const windowMs = options.windowMs || 15 * 60 * 1000;
  const maxRequests = options.maxRequests || 1500;
  const customMessage = options.message || 'Too many requests. Please wait a moment and try again.';
  const skip = options.skip || (() => false);

  return (req, res, next) => {
    // Skip health checks, root routes, and static assets
    if (
      skip(req) ||
      req.path === '/' ||
      req.path === '/api' ||
      req.path === '/health' ||
      req.path === '/api/health' ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/api/uploads')
    ) {
      return next();
    }

    const ip = getClientIp(req);
    const now = Date.now();

    if (!ipRequestStore.has(ip)) {
      ipRequestStore.set(ip, []);
    }

    const requestRecords = ipRequestStore.get(ip);

    // Keep only timestamps within active window
    const activeRecords = requestRecords.filter((rec) => now - rec.time < windowMs);

    if (activeRecords.length >= maxRequests) {
      const oldestTime = activeRecords[0]?.time || now;
      const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - oldestTime)) / 1000));

      res.setHeader('Retry-After', retryAfterSeconds);
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + retryAfterSeconds * 1000) / 1000));

      return res.status(429).json({
        success: false,
        message: customMessage,
        retryAfter: retryAfterSeconds
      });
    }

    // Record this request
    activeRecords.push({ time: now, windowMs });
    ipRequestStore.set(ip, activeRecords);

    // Set informative rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - activeRecords.length));

    next();
  };
};

// Specialized limiters for different route tiers
const apiLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 1500, // 1500 requests per 15 min per IP for normal ERP usage
  message: 'Too many requests generated from this IP. Please wait a moment and try again.'
});

const authLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 35, // 35 login/register attempts per 15 min per IP (prevents brute-force)
  message: 'Too many authentication attempts. Please try again after 15 minutes.'
});

module.exports = rateLimiter;
module.exports.apiLimiter = apiLimiter;
module.exports.authLimiter = authLimiter;

