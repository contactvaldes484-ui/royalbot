const User = require('../models/User');
const SecurityLog = require('../models/SecurityLog');
const fallbackStore = require('../services/RuntimeFallbackStore');

// Extract real IP from request (supports proxies)
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
}

// ─── Check IP-Email binding on REGISTER ─────────────────────────────
// Rule: One IP can only register ONE account
async function checkRegistrationSecurity(req, res, next) {
  try {
    const ip = getClientIp(req);
    req.clientIp = ip;
    if (!fallbackStore.isDbConnected()) return next();
    const email = (req.body.email || '').toLowerCase().trim();

    if (!email) return next();

    // Check if this IP already has a registered account
    const existingUserWithIp = await User.findOne({
      registrationIp: ip,
      email: { $ne: email }
    });

    if (existingUserWithIp) {
      await SecurityLog.create({
        email,
        ip,
        action: 'multi_account_blocked',
        userAgent: req.headers['user-agent'] || '',
        details: `Blocked registration: IP ${ip} already used by ${existingUserWithIp.email}`,
        blocked: true,
      });

      return res.status(403).json({
        error: 'Cette adresse IP est déjà associée à un compte existant. Un seul compte par adresse IP est autorisé.',
        code: 'IP_ALREADY_REGISTERED'
      });
    }

    // Store IP for downstream use
    req.clientIp = ip;
    next();
  } catch (err) {
    console.error('Security middleware error (register):', err.message);
    next(); // Don't block on errors
  }
}

// ─── Check IP-Email binding on LOGIN ────────────────────────────────
// Rule: One email can only be used from its registered IP (or allowed IPs)
// Rule: One IP can only login to ONE account
async function checkLoginSecurity(req, res, next) {
  try {
    const ip = getClientIp(req);
    req.clientIp = ip;
    if (!fallbackStore.isDbConnected()) return next();
    const email = (req.body.email || '').toLowerCase().trim();

    if (!email) return next();

    const user = await User.findOne({ email });
    if (!user) return next(); // Let auth handle invalid email

    // Admin bypass — admins and super_admins can login from anywhere
    if (user.role === 'admin' || user.role === 'super_admin') {
      req.clientIp = ip;
      return next();
    }

    // Check 1: Is this IP already used by a DIFFERENT account?
    const otherUserWithIp = await User.findOne({
      lastLoginIp: ip,
      email: { $ne: email },
      role: { $nin: ['admin', 'super_admin'] }
    });

    if (otherUserWithIp) {
      // Check if the other user has this as their registration IP
      const otherRegisteredHere = otherUserWithIp.registrationIp === ip;
      if (otherRegisteredHere) {
        await SecurityLog.create({
          user: user._id,
          email,
          ip,
          action: 'multi_account_blocked',
          userAgent: req.headers['user-agent'] || '',
          details: `Blocked login: IP ${ip} belongs to account ${otherUserWithIp.email}`,
          blocked: true,
        });

        return res.status(403).json({
          error: 'Cette adresse IP est associée à un autre compte. Un seul compte par adresse IP est autorisé.',
          code: 'IP_BOUND_TO_OTHER_ACCOUNT'
        });
      }
    }

    // Check 2: Is this user trying to login from a new IP that's not in allowedIps?
    if (user.registrationIp && user.registrationIp !== ip) {
      if (user.allowedIps && user.allowedIps.length > 0 && !user.allowedIps.includes(ip)) {
        // New IP detected — flag as suspicious but allow (first 2 IPs)
        if (user.allowedIps.length >= 2) {
          await SecurityLog.create({
            user: user._id,
            email,
            ip,
            action: 'multi_ip_blocked',
            userAgent: req.headers['user-agent'] || '',
            details: `Blocked: user ${email} attempted login from 3rd IP ${ip}. Allowed: ${user.allowedIps.join(', ')}`,
            blocked: true,
          });

          return res.status(403).json({
            error: 'Connexion bloquée : votre compte est utilisé depuis trop d\'adresses IP différentes. Contactez le support.',
            code: 'TOO_MANY_IPS'
          });
        }
      }
    }

    req.clientIp = ip;
    next();
  } catch (err) {
    console.error('Security middleware error (login):', err.message);
    next();
  }
}

// ─── Record IP after successful auth ────────────────────────────────
async function recordLoginIp(userId, ip) {
  try {
    const user = await User.findById(userId);
    if (!user || user.role === 'admin') return;

    const updates = { lastLoginIp: ip };

    // Set registration IP if not set yet
    if (!user.registrationIp) {
      updates.registrationIp = ip;
    }

    // Add to allowedIps if not already there
    if (!user.allowedIps || !user.allowedIps.includes(ip)) {
      updates.$addToSet = { allowedIps: ip };
    }

    await User.findByIdAndUpdate(userId, updates);

    await SecurityLog.create({
      user: userId,
      email: user.email,
      ip,
      action: 'login',
      details: `Successful login from ${ip}`,
    });
  } catch (err) {
    console.error('Record login IP error:', err.message);
  }
}

// ─── Record IP on registration ──────────────────────────────────────
async function recordRegistrationIp(userId, ip) {
  try {
    await User.findByIdAndUpdate(userId, {
      registrationIp: ip,
      lastLoginIp: ip,
      $addToSet: { allowedIps: ip }
    });

    const user = await User.findById(userId);
    await SecurityLog.create({
      user: userId,
      email: user?.email || '',
      ip,
      action: 'register',
      details: `New registration from ${ip}`,
    });
  } catch (err) {
    console.error('Record registration IP error:', err.message);
  }
}

module.exports = {
  getClientIp,
  checkRegistrationSecurity,
  checkLoginSecurity,
  recordLoginIp,
  recordRegistrationIp,
};
