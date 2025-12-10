const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const passwordResetRoutes = require('../../routes/passwordReset');
const User = require('../../models/User');
const { generateToken, hashToken } = require('../../utils/tokenGenerator');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;

// Mock nodemailer
jest.mock('../../utils/mailer', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true)
}));

describe('Password Reset Routes', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    
    app = express();
    app.use(express.json());
    app.use('/api/password-reset', passwordResetRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/password-reset/request', () => {
    it('should send reset email for existing user', async () => {
      // Create test user
      const user = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'OldPassword123!@#',
        role: 'student'
      });
      await user.save();

      const res = await request(app)
        .post('/api/password-reset/request')
        .send({
          email: 'test@example.com'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('sent');

      // Verify token was saved
      const updatedUser = await User.findOne({ email: 'test@example.com' });
      expect(updatedUser.resetPasswordToken).toBeDefined();
      expect(updatedUser.resetPasswordExpires).toBeDefined();
    });

    it('should return success even for non-existent email (security)', async () => {
      const res = await request(app)
        .post('/api/password-reset/request')
        .send({
          email: 'nonexistent@example.com'
        });

      // Should still return 200 to prevent email enumeration
      expect(res.status).toBe(200);
    });

    it('should validate email format', async () => {
      const res = await request(app)
        .post('/api/password-reset/request')
        .send({
          email: 'invalid-email'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/password-reset/reset', () => {
    let resetToken;
    let hashedToken;

    beforeEach(async () => {
      // Create token
      resetToken = generateToken();
      hashedToken = hashToken(resetToken);

      // Create user with reset token
      const user = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'OldPassword123!@#',
        role: 'student',
        resetPasswordToken: hashedToken,
        resetPasswordExpires: Date.now() + 3600000 // 1 hour
      });
      await user.save();
    });

    it('should reset password with valid token', async () => {
      const res = await request(app)
        .post('/api/password-reset/reset')
        .send({
          token: resetToken,
          password: 'NewPassword123!@#'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('successfully');

      // Verify token was cleared
      const user = await User.findOne({ email: 'test@example.com' });
      expect(user.resetPasswordToken).toBeUndefined();
      expect(user.resetPasswordExpires).toBeUndefined();

      // Verify new password works
      const passwordValid = await user.comparePassword('NewPassword123!@#');
      expect(passwordValid).toBe(true);
    });

    it('should not reset password with expired token', async () => {
      // Update user with expired token
      await User.updateOne(
        { email: 'test@example.com' },
        { resetPasswordExpires: Date.now() - 1000 } // Expired
      );

      const res = await request(app)
        .post('/api/password-reset/reset')
        .send({
          token: resetToken,
          password: 'NewPassword123!@#'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('expired');
    });

    it('should not reset password with invalid token', async () => {
      const res = await request(app)
        .post('/api/password-reset/reset')
        .send({
          token: 'invalid-token-12345',
          password: 'NewPassword123!@#'
        });

      expect(res.status).toBe(400);
    });

    it('should validate new password strength', async () => {
      const res = await request(app)
        .post('/api/password-reset/reset')
        .send({
          token: resetToken,
          password: 'weak'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/password-reset/verify-token', () => {
    it('should verify valid token', async () => {
      const resetToken = generateToken();
      const hashedToken = hashToken(resetToken);

      const user = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!@#',
        role: 'student',
        resetPasswordToken: hashedToken,
        resetPasswordExpires: Date.now() + 3600000
      });
      await user.save();

      const res = await request(app)
        .post('/api/password-reset/verify-token')
        .send({
          token: resetToken
        });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .post('/api/password-reset/verify-token')
        .send({
          token: 'invalid-token'
        });

      expect(res.status).toBe(400);
      expect(res.body.valid).toBe(false);
    });
  });
});
