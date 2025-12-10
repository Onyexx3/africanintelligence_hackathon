const crypto = require('crypto');

/**
 * Generate a random verification/reset token
 * @param {number} length - Length of the token (default: 32 bytes = 64 hex characters)
 * @returns {string} - Hex token
 */
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate a 6-digit verification code
 * @returns {string} - 6-digit code
 */
const generate6DigitCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Hash a token for secure storage
 * @param {string} token - Plain token
 * @returns {string} - Hashed token
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = {
  generateToken,
  generate6DigitCode,
  hashToken
};
