const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const speakeasy = require('speakeasy');
const { checkRegistrationSecurity, checkLoginSecurity, recordLoginIp, recordRegistrationIp, getClientIp } = require('../middleware/security');
const fallbackStore = require('../services/RuntimeFallbackStore');

const router = express.Router();

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || '1b38d6a0db1247e468332213f2bb0e74f0e55bc2e676701cecbf15543fc45ba8', {
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

    const existingUser = await fallbackStore.findUserByEmail(email);
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

    if (referralCode && fallbackStore.isDbConnected()) {
      const referrer = await User.findOne({ referralCode }).catch(() => null);
      if (referrer) userData.referredBy = referrer._id;
    }

    const user = await fallbackStore.createUser(userData);
    const token = generateToken(user._id);

    if (fallbackStore.isDbConnected()) {
      await recordRegistrationIp(user._id, ip).catch(() => {});
    }

    res.status(201).json({
      token,
      user: user.toPublicJSON ? user.toPublicJSON() : user
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

    const user = await fallbackStore.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      if (fallbackStore.isDbConnected()) {
        const SecurityLog = require('../models/SecurityLog');
        const ip = req.clientIp || getClientIp(req);
        await SecurityLog.create({ user: user._id, email, ip, action: 'login_failed', userAgent: req.headers['user-agent'] || '', details: `Failed login attempt` }).catch(() => {});
      }
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
    if (user.save) await user.save().catch(() => {});

    if (fallbackStore.isDbConnected()) {
      await recordLoginIp(user._id, ip).catch(() => {});
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: user.toPublicJSON ? user.toPublicJSON() : user
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await fallbackStore.findUserById(req.user._id);
    res.json({ user: user && user.toPublicJSON ? user.toPublicJSON() : user });
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
