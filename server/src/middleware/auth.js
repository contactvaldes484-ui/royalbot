const jwt = require('jsonwebtoken');
const url = require('url');
const User = require('../models/User');
const { hasRole, isAdmin } = require('../lib/permissions');
const planCache = require('../services/planCache');
const fallbackStore = require('../services/RuntimeFallbackStore');

const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || '1b38d6a0db1247e468332213f2bb0e74f0e55bc2e676701cecbf15543fc45ba8');
    const user = await fallbackStore.findUserById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid token or account deactivated.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

/**
 * Require admin or super_admin role.
 */
const requireAdmin = (req, res, next) => {
  if (!isAdmin(req.user?.role)) {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
};

/**
 * Require super_admin role only.
 */
const requireSuperAdmin = (req, res, next) => {
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required.' });
  }
  next();
};

const requireVendor = (req, res, next) => {
  const vendor = req.user?.vendor;
  if (!vendor || !vendor.isVendor) {
    return res.status(403).json({ error: 'Vendor access required.' });
  }
  next();
};

/**
 * Require a specific role or higher.
 * Usage: requireRole('vip')   or   requireRole('admin')
 */
const requireRole = (requiredRole) => (req, res, next) => {
  if (!hasRole(req.user?.role, requiredRole)) {
    return res.status(403).json({ error: `Role '${requiredRole}' or higher required.`, requiredRole });
  }
  next();
};

/**
 * Require user to have an active subscription with at least the given plan tier.
 * Admins always pass.
 * Usage: requirePlan('pro')
 */
const requirePlan = (requiredPlanSlug) => (req, res, next) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  // Admins bypass plan checks
  if (isAdmin(user.role)) return next();

  const sub = user.subscription || {};
  const isExpired = sub.endDate && new Date(sub.endDate) < new Date();
  const userPlan = (sub.isActive && !isExpired) ? (sub.plan || 'free') : 'free';

  if (!planCache.planMeetsTier(userPlan, requiredPlanSlug)) {
    return res.status(403).json({
      error: `This feature requires the '${requiredPlanSlug}' plan or higher.`,
      requiredPlan: requiredPlanSlug,
      currentPlan: userPlan,
      upgradeUrl: '/pricing',
    });
  }
  next();
};

/**
 * Backward compat alias for old code that used requireSubscription.
 */
const requireSubscription = requirePlan;

/**
 * Require a specific feature flag enabled on the user's plan.
 * Usage: requireFeature('aiAccess'), requireFeature('copyTrading')
 * Admins always pass.
 */
const requireFeature = (featureKey) => (req, res, next) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (isAdmin(user.role)) return next();

  const sub = user.subscription || {};
  const isExpired = sub.endDate && new Date(sub.endDate) < new Date();
  const userPlan = (sub.isActive && !isExpired) ? (sub.plan || 'free') : 'free';

  if (!planCache.hasFeature(userPlan, featureKey)) {
    return res.status(403).json({
      error: `Feature '${featureKey}' is not included in your current plan.`,
      feature: featureKey,
      currentPlan: userPlan,
      upgradeUrl: '/pricing',
    });
  }
  next();
};

const authenticateWS = async (req) => {
  try {
    const params = url.parse(req.url, true).query;
    const token = params.token;
    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
    const user = await User.findById(decoded.userId).select('-password');
    return user && user.isActive ? user : null;
  } catch (err) {
    return null;
  }
};

module.exports = {
  authenticate,
  requireAdmin,
  requireSuperAdmin,
  requireVendor,
  requireRole,
  requirePlan,
  requireSubscription, // alias
  requireFeature,
  authenticateWS,
};
