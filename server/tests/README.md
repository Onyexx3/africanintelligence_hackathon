# Testing Documentation

## Overview
This directory contains all test files for the African Intelligence LMS backend.

## Test Structure

```
tests/
├── setup.js              # Global test setup and utilities
├── integration/          # Integration tests
│   ├── auth.test.js     # Authentication tests
│   ├── passwordReset.test.js  # Password reset tests
│   └── twoFactor.test.js      # 2FA tests
└── unit/                # Unit tests (coming soon)
```

## Running Tests

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Only Integration Tests
```bash
npm run test:integration
```

### Run Only Unit Tests
```bash
npm run test:unit
```

### Generate Coverage Report
```bash
npm test
# Coverage report will be generated in ./coverage directory
```

## Test Coverage Goals

- **Lines**: 70%
- **Functions**: 70%
- **Branches**: 70%
- **Statements**: 70%

## What's Tested

### ✅ Authentication (auth.test.js)
- User registration
- User login
- Input validation
- Password strength
- Email format validation
- Duplicate email prevention

### ✅ Password Reset (passwordReset.test.js)
- Request password reset
- Verify reset token
- Reset password with token
- Token expiration
- Email security (no enumeration)

### ✅ Two-Factor Authentication (twoFactor.test.js)
- 2FA setup
- QR code generation
- Token verification
- Backup codes
- Enable/disable 2FA
- 2FA status check

## Test Environment

Tests use:
- **MongoDB Memory Server**: In-memory database for isolated testing
- **Jest**: Test framework
- **Supertest**: HTTP assertions
- **Mocked Email**: Email sending is mocked to prevent actual emails

## Environment Variables

Test environment uses `.env.test` or defaults:
- `JWT_SECRET`: test-jwt-secret-key-for-testing-only
- `MONGODB_URI`: In-memory MongoDB (automatic)
- `NODE_ENV`: test

## Writing New Tests

### Integration Test Template

```javascript
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;

describe('Feature Name', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    
    app = express();
    app.use(express.json());
    // Add your routes
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    // Clean up database
  });

  it('should do something', async () => {
    const res = await request(app)
      .get('/api/endpoint')
      .send({ data: 'value' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('key');
  });
});
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Clean Up**: Always clean database after tests
3. **Mocking**: Mock external services (email, APIs)
4. **Descriptive Names**: Use clear test descriptions
5. **Coverage**: Aim for high coverage on critical paths
6. **Fast Tests**: Keep tests fast and focused

## Troubleshooting

### MongoDB Memory Server Issues
If you encounter issues with MongoDB Memory Server:
```bash
npm install mongodb-memory-server --save-dev
```

### Timeout Errors
Increase timeout in jest.config.js:
```javascript
testTimeout: 30000
```

### Port Already in Use
Tests use in-memory database, no port conflicts should occur.

## Next Steps

- [ ] Add unit tests for utilities
- [ ] Add tests for email verification
- [ ] Add tests for admin settings
- [ ] Add tests for course management
- [ ] Add E2E tests with Playwright
- [ ] Add performance tests
