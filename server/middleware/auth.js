
const jwt = require('jsonwebtoken');
const { ocn } = require('../routes/basics');

// Use dedicated JWT secret, fallback to VAPID key for backwards compatibility
const JWT_SECRET = process.env.JWT_SECRET || process.env.VAPID_PRIVATE_KEY;

module.exports = (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('x-auth-token');
    
    // Check if no token
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Set user from payload
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};
