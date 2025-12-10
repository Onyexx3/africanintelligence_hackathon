const { body, param, query } = require('express-validator');

/**
 * Validation rules for creating a course
 */
const createCourseValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Course title is required')
    .isLength({ min: 5, max: 200 }).withMessage('Title must be between 5 and 200 characters'),
  
  body('category')
    .trim()
    .notEmpty().withMessage('Category is required')
    .isLength({ max: 50 }).withMessage('Category must not exceed 50 characters'),
  
  body('shortDescription')
    .trim()
    .notEmpty().withMessage('Short description is required')
    .isLength({ min: 20, max: 500 }).withMessage('Short description must be between 20 and 500 characters'),
  
  body('fullDescription')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('Full description must not exceed 5000 characters'),
  
  body('level')
    .notEmpty().withMessage('Course level is required')
    .isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid course level'),
  
  body('duration')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Duration must not exceed 50 characters'),
  
  body('prerequisites')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Prerequisites must not exceed 1000 characters'),
  
  body('learningOutcomes')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Learning outcomes must not exceed 2000 characters'),
  
  body('thumbnail')
    .optional()
    .trim()
];

/**
 * Validation rules for updating a course
 */
const updateCourseValidation = [
  param('id')
    .matches(/^[a-f\d]{24}$/i).withMessage('Invalid course ID format'),
  
  ...createCourseValidation
];

/**
 * Validation rules for course enrollment
 */
const enrollCourseValidation = [
  param('id')
    .matches(/^[a-f\d]{24}$/i).withMessage('Invalid course ID format')
];

/**
 * Validation rules for course review
 */
const reviewCourseValidation = [
  param('id')
    .matches(/^[a-f\d]{24}$/i).withMessage('Invalid course ID format'),
  
  body('rating')
    .notEmpty().withMessage('Rating is required')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Comment must not exceed 1000 characters')
];

/**
 * Validation rules for course query parameters
 */
const queryCourseValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  
  query('category')
    .optional()
    .trim(),
  
  query('level')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid course level'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Search query too long')
];

module.exports = {
  createCourseValidation,
  updateCourseValidation,
  enrollCourseValidation,
  reviewCourseValidation,
  queryCourseValidation
};
