const express = require('express');
const router = express.Router();
const { generateToken, hashToken } = require('../utils/tokenGenerator');
const { sendVerificationEmail } = require('../utils/mailer');
const { verifyEmailValidation } = require('../validators/authValidators');
const { validate } = require('../middleware/validate');
const auth = require('../middleware/auth');
const ApiError = require('../utils/ApiError');
const { ObjectId } = require('mongodb');

/**
 * POST /api/email-verification/send
 * Send email verification link
 */
router.post('/send', auth, async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const userId = new ObjectId(req.user.userId);

    // Get user
    const user = await db.collection('users').findOne({ _id: userId });
    
    if (!user) {
      return next(ApiError.notFound('User not found'));
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.json({ 
        success: true, 
        message: 'Email already verified' 
      });
    }

    // Generate verification token
    const verificationToken = generateToken();
    const hashedToken = hashToken(verificationToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Save verification token
    await db.collection('emailVerifications').insertOne({
      userId: user._id,
      token: hashedToken,
      expiresAt,
      verified: false,
      createdAt: new Date()
    });

    // Create verification URL
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;

    // Send email (async)
    sendVerificationEmail(user.email, user.name, verificationUrl).catch(err => {
      console.error('Failed to send verification email:', err);
    });

    res.json({ 
      success: true, 
      message: 'Verification email sent successfully' 
    });
  } catch (error) {
    console.error('Send verification email error:', error);
    next(ApiError.internal('Failed to send verification email'));
  }
});

/**
 * POST /api/email-verification/verify
 * Verify email using token
 */
router.post('/verify',
  verifyEmailValidation,
  validate,
  async (req, res, next) => {
    try {
      const db = req.app.locals.db;
      const { token } = req.body;

      // Hash the token
      const hashedToken = hashToken(token);

      // Find valid verification token
      const verificationRecord = await db.collection('emailVerifications').findOne({
        token: hashedToken,
        verified: false,
        expiresAt: { $gt: new Date() }
      });

      if (!verificationRecord) {
        return next(ApiError.badRequest('Invalid or expired verification token'));
      }

      // Update user as verified
      await db.collection('users').updateOne(
        { _id: verificationRecord.userId },
        { 
          $set: { 
            emailVerified: true,
            emailVerifiedAt: new Date()
          } 
        }
      );

      // Mark token as verified
      await db.collection('emailVerifications').updateOne(
        { _id: verificationRecord._id },
        { $set: { verified: true, verifiedAt: new Date() } }
      );

      res.json({ 
        success: true, 
        message: 'Email verified successfully!' 
      });
    } catch (error) {
      console.error('Email verification error:', error);
      next(ApiError.internal('Failed to verify email'));
    }
  }
);

/**
 * GET /api/email-verification/status
 * Check verification status
 */
router.get('/status', auth, async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const userId = new ObjectId(req.user.userId);

    const user = await db.collection('users').findOne(
      { _id: userId },
      { projection: { emailVerified: 1, emailVerifiedAt: 1 } }
    );

    if (!user) {
      return next(ApiError.notFound('User not found'));
    }

    res.json({ 
      verified: user.emailVerified || false,
      verifiedAt: user.emailVerifiedAt || null
    });
  } catch (error) {
    console.error('Check verification status error:', error);
    next(ApiError.internal('Failed to check verification status'));
  }
});

module.exports = router;
