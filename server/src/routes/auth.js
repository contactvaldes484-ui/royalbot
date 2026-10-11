const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const speakeasy = require('speakeasy');
const { checkRegistrationSecurity, checkLoginSecurity, recordLoginIp, recordRegistrationIp, getClientIp } = require('../middleware/security');

const router = express.Router();

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'default_secret', {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

const generateReferralCode = () => {
  return 'DT' + Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Register (with IP security check)
router.post('/register', checkRegistrationSecurity, async (req, res) => {
  try {
    const { firstName, lastName, email, password, referralCode } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const ip = req.clientIp || getClientIp(req);

    const userData = {
      firstName,
      lastName,
      email,
      password,
      referralCode: generateReferralCode(),
      registrationIp: ip,
      lastLoginIp: ip,
      allowedIps: [ip],
    };

    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) userData.referredBy = referrer._id;
    }

    const user = await User.create(userData);
    const token = generateToken(user._id);

    // Record registration IP
    await recordRegistrationIp(user._id, ip);

    res.status(201).json({
      token,
      user: user.toPublicJSON()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login (with IP security check)
router.post('/login', checkLoginSecurity, async (req, res) => {
  try {
    const { email, password, twoFactorCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Log failed attempt
      const SecurityLog = require('../models/SecurityLog');
      const ip = req.clientIp || getClientIp(req);
      await SecurityLog.create({ user: user._id, email, ip, action: 'login_failed', userAgent: req.headers['user-agent'] || '', details: `Failed login attempt` });
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account deactivated.' });
    }

    // 2FA check
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        return res.status(200).json({ requires2FA: true });
      }
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorCode
      });
      if (!verified) {
        return res.status(401).json({ error: 'Invalid 2FA code.' });
      }
    }

    const ip = req.clientIp || getClientIp(req);
    user.lastLogin = new Date();
    user.lastLoginIp = ip;
    await user.save();

    // Record login IP
    await recordLoginIp(user._id, ip);

    const token = generateToken(user._id);

    res.json({
      token,
      user: user.toPublicJSON()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -twoFactorSecret');
    res.json({ user: user.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enable 2FA
router.post('/2fa/enable', authenticate, async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({ name: `RoyalBot (${req.user.email})` });
    req.user.twoFactorSecret = secret.base32;
    await req.user.save();

    res.json({
      secret: secret.base32,
      qrCodeUrl: secret.otpauth_url
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Confirm 2FA
router.post('/2fa/confirm', authenticate, async (req, res) => {
  try {
    const { code } = req.body;
    const verified = speakeasy.totp.verify({
      secret: req.user.twoFactorSecret,
      encoding: 'base32',
      token: code
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    req.user.twoFactorEnabled = true;
    await req.user.save();

    res.json({ message: '2FA enabled successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
