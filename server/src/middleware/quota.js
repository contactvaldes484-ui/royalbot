/**
 * Plan-based quota middleware.
 * Enforces per-plan resource limits (max robots, max Binance accounts, etc.).
 * Admins always bypass.
 * NB: les quotas comptes/robots Binance sont gérés dans routes/binance.js.
 */
const planCache = require('../services/planCache');
const { isAdmin } = require('../lib/permissions');

function getUserPlan(user) {
  const sub = user?.subscription || {};
  const isExpired = sub.endDate && new Date(sub.endDate) < new Date();
  const userPlanSlug = (sub.isActive && !isExpired) ? (sub.plan || 'free') : 'free';
  return planCache.getPlan(userPlanSlug) || { slug: 'free', limits: {} };
}

/**
 * Enforce maxTradesPerDay. Soft check based on User.subscription.usage.tradesToday.
 */
const enforceTradeQuota = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
  if (isAdmin(req.user.role)) return next();

  const plan = getUserPlan(req.user);
  const limit = plan.limits?.maxTradesPerDay ?? 0;
  if (limit === -1) return next();

  const used = req.user.subscription?.usage?.tradesToday || 0;
  if (used >= limit) {
    return res.status(403).json({
      error: `Quota de trades journaliers atteint (${used}/${limit}). Passez à un plan supérieur.`,
      currentPlan: plan.slug,
      limit,
      current: used,
      upgradeUrl: '/pricing',
    });
  }
  next();
};

/**
 * Enforce maxAIAnalysesPerDay. Resets the daily counter on a new calendar day,
 * then increments. Admins bypass; -1 means unlimited.
 */
const enforceAIQuota = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    if (isAdmin(req.user.role)) return next();

    const plan = getUserPlan(req.user);
    const limit = plan.limits?.maxAIAnalysesPerDay ?? 0;

    const user = req.user;
    if (!user.subscription) user.subscription = {};
    if (!user.subscription.usage) user.subscription.usage = {};
    const usage = user.subscription.usage;

    // Reset if last reset was on a previous calendar day (UTC)
    const last = usage.lastAIReset ? new Date(usage.lastAIReset) : null;
    const now = new Date();
    const isNewDay = !last ||
      last.getUTCFullYear() !== now.getUTCFullYear() ||
      last.getUTCMonth() !== now.getUTCMonth() ||
      last.getUTCDate() !== now.getUTCDate();
    if (isNewDay) {
      usage.aiAnalysesToday = 0;
      usage.lastAIReset = now;
    }

    if (limit !== -1) {
      const used = usage.aiAnalysesToday || 0;
      if (used >= limit) {
        return res.status(403).json({
          error: `Quota d'analyses IA journalières atteint (${used}/${limit}). Passez à un plan supérieur pour analyser sans limite.`,
          currentPlan: plan.slug,
          limit,
          current: used,
          upgradeUrl: '/pricing',
        });
      }
    }

    usage.aiAnalysesToday = (usage.aiAnalysesToday || 0) + 1;
    user.markModified('subscription.usage');
    await user.save();

    res.locals.aiQuota = {
      limit,
      used: usage.aiAnalysesToday,
      remaining: limit === -1 ? -1 : Math.max(0, limit - usage.aiAnalysesToday),
    };
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  enforceTradeQuota,
  enforceAIQuota,
  getUserPlan,
};
