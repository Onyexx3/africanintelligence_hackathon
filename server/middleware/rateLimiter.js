const rateLimit = require('express-rate-limit');

// General API rate limiter - 100 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip successful requests from the count
  skipSuccessfulRequests: false,
});

// Strict rate limiter for authentication endpoints - 5 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    status: 'error',
    message: 'Too many login/registration attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests to allow legitimate users
  skipSuccessfulRequests: true,
});

// Strict limiter for sensitive operations - 10 requests per minute
const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    status: 'error',
    message: 'Too many requests. Please slow down and try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Password reset limiter - 3 requests per hour
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    status: 'error',
    message: 'Too many password reset attempts. Please try again after 1 hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// File upload limiter - 20 uploads per hour
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: {
    status: 'error',
    message: 'Upload limit exceeded. Please try again after 1 hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  authLimiter,
  strictLimiter,
  passwordResetLimiter,
  uploadLimiter
};
