const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const twoFactorRoutes = require('../../routes/twoFactor');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;
let authToken;
let testUserId;

describe('Two-Factor Authentication Routes', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    
    app = express();
    app.use(express.json());
    
    // Mock auth middleware
    app.use((req, res, next) => {
      if (req.headers['x-auth-token']) {
        try {
          const decoded = jwt.verify(req.headers['x-auth-token'], process.env.JWT_SECRET);
          req.user = decoded;
        } catch (err) {
          return res.status(401).json({ message: 'Invalid token' });
        }
      }
      next();
    });
    
    app.use('/api/2fa', twoFactorRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Create test user and generate token
    const user = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'Test123!@#',
      role: 'student'
    });
    await user.save();
    
    testUserId = user._id.toString();
    authToken = jwt.sign(
      { userId: testUserId, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/2fa/setup', () => {
    it('should generate 2FA secret and QR code', async () => {
      const res = await request(app)
        .post('/api/2fa/setup')
        .set('x-auth-token', authToken);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('secret');
      expect(res.body).toHaveProperty('qrCode');
      expect(res.body).toHaveProperty('manualEntryKey');

      // Verify secret was saved
      const user = await User.findById(testUserId);
      expect(user.twoFactorTempSecret).toBeDefined();
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/2fa/setup');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/2fa/verify-setup', () => {
    let tempSecret;

    beforeEach(async () => {
      // Generate temp secret
      tempSecret = speakeasy.generateSecret({ length: 32 });
      await User.findByIdAndUpdate(testUserId, {
        twoFactorTempSecret: tempSecret.base32
      });
    });

    it('should activate 2FA with valid token', async () => {
      // Generate valid token
      const token = speakeasy.totp({
        secret: tempSecret.base32,
        encoding: 'base32'
      });

      const res = await request(app)
        .post('/api/2fa/verify-setup')
        .set('x-auth-token', authToken)
        .send({ token });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('backupCodes');
      expect(res.body.backupCodes).toHaveLength(10);

      // Verify 2FA is enabled
      const user = await User.findById(testUserId);
      expect(user.twoFactorEnabled).toBe(true);
      expect(user.twoFactorSecret).toBeDefined();
      expect(user.twoFactorTempSecret).toBeUndefined();
    });

    it('should not activate 2FA with invalid token', async () => {
      const res = await request(app)
        .post('/api/2fa/verify-setup')
        .set('x-auth-token', authToken)
        .send({ token: '000000' });

      expect(res.status).toBe(400);

      // Verify 2FA is not enabled
      const user = await User.findById(testUserId);
      expect(user.twoFactorEnabled).toBe(false);
    });
  });

  describe('POST /api/2fa/verify', () => {
    let twoFactorSecret;

    beforeEach(async () => {
      // Setup 2FA for user
      twoFactorSecret = speakeasy.generateSecret({ length: 32 });
      await User.findByIdAndUpdate(testUserId, {
        twoFactorEnabled: true,
        twoFactorSecret: twoFactorSecret.base32
      });
    });

    it('should verify valid 2FA token', async () => {
      const token = speakeasy.totp({
        secret: twoFactorSecret.base32,
        encoding: 'base32'
      });

      const res = await request(app)
        .post('/api/2fa/verify')
        .set('x-auth-token', authToken)
        .send({ token });

      expect(res.status).toBe(200);
      expect(res.body.verified).toBe(true);
    });

    it('should reject invalid 2FA token', async () => {
      const res = await request(app)
        .post('/api/2fa/verify')
        .set('x-auth-token', authToken)
        .send({ token: '000000' });

      expect(res.status).toBe(400);
    });

    it('should verify valid backup code', async () => {
      // Generate and save backup code
      const bcrypt = require('bcryptjs');
      const backupCode = '12345678';
      const hashedCode = await bcrypt.hash(backupCode, 10);
      
      await User.findByIdAndUpdate(testUserId, {
        backupCodes: [hashedCode]
      });

      const res = await request(app)
        .post('/api/2fa/verify')
        .set('x-auth-token', authToken)
        .send({ token: backupCode, isBackupCode: true });

      expect(res.status).toBe(200);
      expect(res.body.verified).toBe(true);

      // Verify backup code was removed
      const user = await User.findById(testUserId);
      expect(user.backupCodes).toHaveLength(0);
    });
  });

  describe('POST /api/2fa/disable', () => {
    beforeEach(async () => {
      const secret = speakeasy.generateSecret({ length: 32 });
      await User.findByIdAndUpdate(testUserId, {
        twoFactorEnabled: true,
        twoFactorSecret: secret.base32
      });
    });

    it('should disable 2FA with valid password', async () => {
      const res = await request(app)
        .post('/api/2fa/disable')
        .set('x-auth-token', authToken)
        .send({ password: 'Test123!@#' });

      expect(res.status).toBe(200);

      // Verify 2FA is disabled
      const user = await User.findById(testUserId);
      expect(user.twoFactorEnabled).toBe(false);
      expect(user.twoFactorSecret).toBeUndefined();
    });

    it('should not disable 2FA with wrong password', async () => {
      const res = await request(app)
        .post('/api/2fa/disable')
        .set('x-auth-token', authToken)
        .send({ password: 'WrongPassword' });

      expect(res.status).toBe(401);

      // Verify 2FA is still enabled
      const user = await User.findById(testUserId);
      expect(user.twoFactorEnabled).toBe(true);
    });
  });

  describe('GET /api/2fa/status', () => {
    it('should return 2FA status as enabled', async () => {
      await User.findByIdAndUpdate(testUserId, {
        twoFactorEnabled: true
      });

      const res = await request(app)
        .get('/api/2fa/status')
        .set('x-auth-token', authToken);

      expect(res.status).toBe(200);
      expect(res.body.enabled).toBe(true);
    });

    it('should return 2FA status as disabled', async () => {
      const res = await request(app)
        .get('/api/2fa/status')
        .set('x-auth-token', authToken);

      expect(res.status).toBe(200);
      expect(res.body.enabled).toBe(false);
    });
  });
});
