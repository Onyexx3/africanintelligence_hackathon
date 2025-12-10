const express = require('express');
const router = express.Router();
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const auth = require('../middleware/auth');
const ApiError = require('../utils/ApiError');
const { ObjectId } = require('mongodb');

/**
 * POST /api/2fa/setup
 * Generate 2FA secret and QR code
 */
router.post('/setup', auth, async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const userId = new ObjectId(req.user.userId);

    // Get user
    const user = await db.collection('users').findOne({ _id: userId });
    if (!user) {
      return next(ApiError.notFound('User not found'));
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `African Intelligence LMS (${user.email})`,
      length: 32
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Save temp secret (not activated until verified)
    await db.collection('users').updateOne(
      { _id: userId },
      { 
        $set: { 
          tempTwoFactorSecret: secret.base32,
          tempTwoFactorEnabled: false
        } 
      }
    );

    res.json({
      success: true,
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntry: secret.otpauth_url
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    next(ApiError.internal('Failed to setup 2FA'));
  }
});

/**
 * POST /api/2fa/verify-setup
 * Verify and activate 2FA
 */
router.post('/verify-setup', auth, async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const userId = new ObjectId(req.user.userId);
    const { token } = req.body;

    if (!token) {
      return next(ApiError.badRequest('Verification token is required'));
    }

    // Get user
    const user = await db.collection('users').findOne({ _id: userId });
    if (!user || !user.tempTwoFactorSecret) {
      return next(ApiError.badRequest('2FA setup not initiated'));
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.tempTwoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps before/after
    });

    if (!verified) {
      return next(ApiError.badRequest('Invalid verification code'));
    }

    // Activate 2FA
    await db.collection('users').updateOne(
      { _id: userId },
      { 
        $set: { 
          twoFactorSecret: user.tempTwoFactorSecret,
          twoFactorEnabled: true
        },
        $unset: {
          tempTwoFactorSecret: '',
          tempTwoFactorEnabled: ''
        }
      }
    );

    res.json({
      success: true,
      message: '2FA successfully activated'
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    next(ApiError.internal('Failed to verify 2FA'));
  }
});

/**
 * POST /api/2fa/verify
 * Verify 2FA token during login
 */
router.post('/verify', auth, async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const userId = new ObjectId(req.user.userId);
    const { token } = req.body;

    if (!token) {
      return next(ApiError.badRequest('2FA token is required'));
    }

    // Get user
    const user = await db.collection('users').findOne({ _id: userId });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return next(ApiError.badRequest('2FA not enabled for this user'));
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return next(ApiError.badRequest('Invalid 2FA code'));
    }

    res.json({
      success: true,
      verified: true
    });
  } catch (error) {
    console.error('2FA login verification error:', error);
    next(ApiError.internal('Failed to verify 2FA'));
  }
});

/**
 * POST /api/2fa/disable
 * Disable 2FA
 */
router.post('/disable', auth, async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const userId = new ObjectId(req.user.userId);
    const { password, token } = req.body;

    if (!password || !token) {
      return next(ApiError.badRequest('Password and 2FA token are required'));
    }

    // Get user
    const user = await db.collection('users').findOne({ _id: userId });
    if (!user) {
      return next(ApiError.notFound('User not found'));
    }

    // Verify password
    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return next(ApiError.badRequest('Invalid password'));
    }

    // Verify 2FA token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return next(ApiError.badRequest('Invalid 2FA code'));
    }

    // Disable 2FA
    await db.collection('users').updateOne(
      { _id: userId },
      { 
        $unset: { 
          twoFactorSecret: '',
          twoFactorEnabled: '',
          tempTwoFactorSecret: '',
          tempTwoFactorEnabled: ''
        } 
      }
    );

    res.json({
      success: true,
      message: '2FA has been disabled'
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    next(ApiError.internal('Failed to disable 2FA'));
  }
});

/**
 * GET /api/2fa/status
 * Check if 2FA is enabled
 */
router.get('/status', auth, async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const userId = new ObjectId(req.user.userId);

    const user = await db.collection('users').findOne(
      { _id: userId },
      { projection: { twoFactorEnabled: 1 } }
    );

    if (!user) {
      return next(ApiError.notFound('User not found'));
    }

    res.json({
      enabled: user.twoFactorEnabled || false
    });
  } catch (error) {
    console.error('2FA status check error:', error);
    next(ApiError.internal('Failed to check 2FA status'));
  }
});

/**
 * POST /api/2fa/backup-codes
 * Generate backup codes
 */
router.post('/backup-codes', auth, async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const userId = new ObjectId(req.user.userId);
    const crypto = require('crypto');

    // Generate 10 backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // Hash backup codes before storing
    const bcrypt = require('bcryptjs');
    const hashedCodes = await Promise.all(
      backupCodes.map(code => bcrypt.hash(code, 10))
    );

    // Save hashed codes
    await db.collection('users').updateOne(
      { _id: userId },
      { $set: { twoFactorBackupCodes: hashedCodes } }
    );

    res.json({
      success: true,
      backupCodes // Show once, user must save them
    });
  } catch (error) {
    console.error('Backup codes generation error:', error);
    next(ApiError.internal('Failed to generate backup codes'));
  }
});

module.exports = router;
