// Test setup file
require('dotenv').config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test-lms';

// Increase timeout for database operations
jest.setTimeout(30000);

// Global test utilities
global.testUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'Test123!@#',
  role: 'student'
};

global.testAdmin = {
  name: 'Test Admin',
  email: 'admin@example.com',
  password: 'Admin123!@#',
  role: 'admin'
};

global.testFacilitator = {
  name: 'Test Facilitator',
  email: 'facilitator@example.com',
  password: 'Facilitator123!@#',
  role: 'facilitator'
};

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};
