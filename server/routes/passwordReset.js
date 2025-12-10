const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { generateToken, hashToken } = require('../utils/tokenGenerator');
const { sendPasswordResetEmail } = require('../utils/mailer');
const { resetPasswordRequestValidation, resetPasswordValidation } = require('../validators/authValidators');
const { validate } = require('../middleware/validate');
const { passwordResetLimiter } = require('../middleware/rateLimiter');
const ApiError = require('../utils/ApiError');

/**
 * POST /api/password-reset/request
 * Request a password reset email
 */
router.post('/request', 
  passwordResetLimiter,
  resetPasswordRequestValidation,
  validate,
  async (req, res, next) => {
    try {
      const db = req.app.locals.db;
      const { email } = req.body;

      // Find user
      const user = await db.collection('users').findOne({ email });
      
      // Always return success (security: don't reveal if email exists)
      if (!user) {
        return res.json({ 
          success: true, 
          message: 'If that email exists, a reset link has been sent.' 
        });
      }

      // Generate reset token
      const resetToken = generateToken();
      const hashedToken = hashToken(resetToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Save reset token to database
      await db.collection('passwordResets').insertOne({
        userId: user._id,
        token: hashedToken,
        expiresAt,
        used: false,
        createdAt: new Date()
      });

      // Create reset URL
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

      // Send email (async)
      sendPasswordResetEmail(user.email, user.name, resetUrl).catch(err => {
        console.error('Failed to send password reset email:', err);
      });

      res.json({ 
        success: true, 
        message: 'If that email exists, a reset link has been sent to your email.' 
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      next(ApiError.internal('Failed to process password reset request'));
    }
  }
);

/**
 * POST /api/password-reset/reset
 * Reset password using token
 */
router.post('/reset',
  resetPasswordValidation,
  validate,
  async (req, res, next) => {
    try {
      const db = req.app.locals.db;
      const { token, password } = req.body;

      // Hash the token to match database
      const hashedToken = hashToken(token);

      // Find valid reset token
      const resetRecord = await db.collection('passwordResets').findOne({
        token: hashedToken,
        used: false,
        expiresAt: { $gt: new Date() }
      });

      if (!resetRecord) {
        return next(ApiError.badRequest('Invalid or expired reset token'));
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Update user password
      await db.collection('users').updateOne(
        { _id: resetRecord.userId },
        { $set: { password: hashedPassword } }
      );

      // Mark token as used
      await db.collection('passwordResets').updateOne(
        { _id: resetRecord._id },
        { $set: { used: true, usedAt: new Date() } }
      );

      res.json({ 
        success: true, 
        message: 'Password reset successful. You can now login with your new password.' 
      });
    } catch (error) {
      console.error('Password reset error:', error);
      next(ApiError.internal('Failed to reset password'));
    }
  }
);

/**
 * POST /api/password-reset/verify-token
 * Verify if a reset token is valid
 */
router.post('/verify-token', async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const { token } = req.body;

    if (!token) {
      return next(ApiError.badRequest('Token is required'));
    }

    const hashedToken = hashToken(token);

    const resetRecord = await db.collection('passwordResets').findOne({
      token: hashedToken,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!resetRecord) {
      return res.json({ valid: false, message: 'Invalid or expired token' });
    }

    res.json({ valid: true });
  } catch (error) {
    console.error('Token verification error:', error);
    next(ApiError.internal('Failed to verify token'));
  }
});

module.exports = router;
