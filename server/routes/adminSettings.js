const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const ApiError = require('../utils/ApiError');

/**
 * GET /api/admin/settings
 * Get current system settings
 */
router.get('/settings', auth, roleAuth(['admin']), async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    
    // Get settings or return defaults
    let settings = await db.collection('systemSettings').findOne({ type: 'global' });
    
    if (!settings) {
      // Default settings
      settings = {
        type: 'global',
        emailVerificationRequired: false,
        twoFactorEnabled: true,
        passwordResetEnabled: true,
        socialLoginProviders: {
          google: { 
            enabled: true, 
            clientId: process.env.GOOGLE_CLIENT_ID || '' 
          },
          github: { 
            enabled: false, 
            clientId: process.env.GITHUB_CLIENT_ID || '',
            clientSecret: process.env.GITHUB_CLIENT_SECRET ? '***' : ''
          },
          linkedin: { 
            enabled: false, 
            clientId: process.env.LINKEDIN_CLIENT_ID || '',
            clientSecret: process.env.LINKEDIN_CLIENT_SECRET ? '***' : ''
          }
        },
        registrationMode: 'open',
        emailProvider: {
          service: process.env.EMAIL_SERVICE || 'gmail',
          user: process.env.EMAIL_USER || '',
          configured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS)
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Save default settings
      await db.collection('systemSettings').insertOne(settings);
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    next(ApiError.internal('Failed to load settings'));
  }
});

/**
 * POST /api/admin/settings
 * Update system settings
 */
router.post('/settings', auth, roleAuth(['admin']), async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const { 
      emailVerificationRequired,
      twoFactorEnabled,
      passwordResetEnabled,
      socialLoginProviders,
      registrationMode
    } = req.body;
    
    // Validate
    if (registrationMode && !['open', 'closed', 'invite'].includes(registrationMode)) {
      return next(ApiError.badRequest('Invalid registration mode'));
    }
    
    const updateData = {
      emailVerificationRequired,
      twoFactorEnabled,
      passwordResetEnabled,
      socialLoginProviders,
      registrationMode,
      updatedAt: new Date(),
      updatedBy: req.user.userId
    };
    
    // Update or insert settings
    await db.collection('systemSettings').updateOne(
      { type: 'global' },
      { 
        $set: updateData,
        $setOnInsert: { 
          type: 'global', 
          createdAt: new Date() 
        }
      },
      { upsert: true }
    );
    
    res.json({
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Update settings error:', error);
    next(ApiError.internal('Failed to update settings'));
  }
});

/**
 * GET /api/admin/settings/check/:feature
 * Check if a specific feature is enabled
 */
router.get('/settings/check/:feature', async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const { feature } = req.params;
    
    const settings = await db.collection('systemSettings').findOne({ type: 'global' });
    
    let enabled = false;
    
    switch (feature) {
      case 'email-verification':
        enabled = settings?.emailVerificationRequired || false;
        break;
      case '2fa':
        enabled = settings?.twoFactorEnabled !== false; // Default true
        break;
      case 'password-reset':
        enabled = settings?.passwordResetEnabled !== false; // Default true
        break;
      case 'google-oauth':
        enabled = settings?.socialLoginProviders?.google?.enabled !== false;
        break;
      case 'github-oauth':
        enabled = settings?.socialLoginProviders?.github?.enabled || false;
        break;
      case 'linkedin-oauth':
        enabled = settings?.socialLoginProviders?.linkedin?.enabled || false;
        break;
      case 'registration':
        enabled = settings?.registrationMode !== 'closed';
        break;
      default:
        return next(ApiError.badRequest('Unknown feature'));
    }
    
    res.json({ enabled });
  } catch (error) {
    console.error('Check feature error:', error);
    next(ApiError.internal('Failed to check feature status'));
  }
});

/**
 * POST /api/admin/settings/test-email
 * Test email configuration
 */
router.post('/settings/test-email', auth, roleAuth(['admin']), async (req, res, next) => {
  try {
    const { testEmail } = req.body;
    
    if (!testEmail) {
      return next(ApiError.badRequest('Test email address required'));
    }
    
    // Import mailer
    const { sendTestEmail } = require('../utils/mailer');
    
    await sendTestEmail(testEmail);
    
    res.json({
      success: true,
      message: `Test email sent to ${testEmail}`
    });
  } catch (error) {
    console.error('Test email error:', error);
    next(ApiError.internal('Failed to send test email. Check email configuration.'));
  }
});

module.exports = router;
