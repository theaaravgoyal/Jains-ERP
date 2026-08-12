const authorize = (permissionCode) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized, login required.' });
    }

    // Super Admin and Admin have access across all modules
    if (req.user.role === 'Super Admin' || req.user.role === 'Admin') {
      return next();
    }

    // Check if user contains the requested permission code claim
    const hasPermission = Array.isArray(req.user.permissions) && req.user.permissions.some(
      p => p.code === permissionCode
    );

    if (!hasPermission) {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. Missing permission claim: ${permissionCode}` 
      });
    }

    next();
  };
};

module.exports = { authorize };
