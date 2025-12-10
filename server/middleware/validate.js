const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Middleware to validate request data using express-validator
 * Place after validation rules in route definitions
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.param,
      message: err.msg,
      value: err.value
    }));
    
    return next(ApiError.validationError(
      errorMessages.length === 1 
        ? errorMessages[0].message 
        : 'Validation failed'
    ));
  }
  
  next();
};

/**
 * Sanitize common inputs to prevent XSS and injection attacks
 */
const sanitizeInputs = (req, res, next) => {
  // Trim whitespace from all string inputs
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  
  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].trim();
      }
    });
  }
  
  next();
};

/**
 * Validate MongoDB ObjectId format
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    // MongoDB ObjectId is 24 hex characters
    const objectIdPattern = /^[a-f\d]{24}$/i;
    
    if (!objectIdPattern.test(id)) {
      return next(ApiError.badRequest(`Invalid ${paramName} format`));
    }
    
    next();
  };
};

/**
 * Check if request has required fields
 */
const requireFields = (fields) => {
  return (req, res, next) => {
    const missingFields = [];
    
    fields.forEach(field => {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    });
    
    if (missingFields.length > 0) {
      return next(ApiError.badRequest(
        `Missing required fields: ${missingFields.join(', ')}`
      ));
    }
    
    next();
  };
};

module.exports = {
  validate,
  sanitizeInputs,
  validateObjectId,
  requireFields
};
