const ApiError = require('../utils/ApiError');

/**
 * Convert any error to ApiError format
 */
const errorConverter = (err, req, res, next) => {
  let error = err;
  
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || error.status || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, false, err.stack);
  }
  
  next(error);
};

/**
 * Error handler middleware
 * Must be the last middleware in the chain
 */
const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;
  
  // In production, don't leak error details for non-operational errors
  if (process.env.NODE_ENV === 'production' && !err.isOperational) {
    statusCode = 500;
    message = 'Internal Server Error';
  }
  
  // Store error message for logging
  res.locals.errorMessage = err.message;
  
  const response = {
    code: statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      original: err.original || undefined
    }),
  };
  
  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      statusCode,
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      body: req.body,
      query: req.query,
      params: req.params
    });
  }
  
  res.status(statusCode).json(response);
};

/**
 * Handle 404 errors
 */
const notFound = (req, res, next) => {
  const error = new ApiError(404, `Not Found - ${req.originalUrl}`);
  next(error);
};

module.exports = {
  errorConverter,
  errorHandler,
  notFound,
  ApiError
};
