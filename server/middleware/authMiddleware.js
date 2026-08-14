const authService = require('../services/authService');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token and load user context + permissions list
      const user = await authService.verifyUserToken(token);

      // Attach user to request object
      req.user = user;
      next();
    } catch (error) {
      console.error('Auth verification error:', error.message);
      const status = error.statusCode || (error.message.includes('inactive') ? 403 : 401);
      return res.status(status).json({ success: false, message: error.message });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
};

module.exports = { protect };
