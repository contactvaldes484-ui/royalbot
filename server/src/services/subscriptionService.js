const Subscription = require('../models/Subscription');
const User = require('../models/User');
const planCache = require('./planCache');

/**
 * Activate a subscription for a user.
 * - Deactivates previous active subs
 * - Computes endDate from billingCycle
 * - Updates User.subscription
 */
async function activateSubscription({ userId, planSlug, billingCycle = 'monthly', paymentMethod = 'manual', amount = 0, paymentId = null, grantedByAdmin = false, grantedBy = null, adminNote = null, ip = null, userAgent = null, autoRenew = false }) {
  const plan = planCache.getPlan(planSlug);
  if (!plan) throw new Error(`Plan '${planSlug}' not found`);

  // Compute end date
  const startDate = new Date();
  let endDate;
  if (billingCycle === 'lifetime') {
    endDate = new Date('2099-12-31');
  } else if (billingCycle === 'yearly') {
    endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
  }

  // Deactivate all current active subs
  await Subscription.updateMany(
    { user: userId, isActive: true },
    { isActive: false, cancelledAt: new Date(), cancelReason: 'Replaced by new subscription' }
  );

  // Create new subscription
  const sub = await Subscription.create({
    user: userId,
    plan: planSlug,
    billingCycle,
    amount,
    paymentMethod,
    paymentId,
    paymentStatus: grantedByAdmin || amount === 0 ? 'confirmed' : 'pending',
    isActive: grantedByAdmin || amount === 0, // free / admin-granted = immediately active
    autoRenew,
    startDate,
    endDate,
    grantedByAdmin,
    grantedBy,
    adminNote,
    ip,
    userAgent,
  });

  // Update User.subscription only if confirmed
  if (sub.isActive) {
    await User.findByIdAndUpdate(userId, {
      'subscription.plan': planSlug,
      'subscription.billingCycle': billingCycle,
      'subscription.startDate': startDate,
      'subscription.endDate': endDate,
      'subscription.isActive': true,
      'subscription.autoRenew': autoRenew,
    });
  }

  return sub;
}

/**
 * Confirm a pending subscription (admin confirms crypto/mobile money payment).
 */
async function confirmPendingSubscription(subscriptionId, { txHash, adminNote, confirmedBy } = {}) {
  const sub = await Subscription.findById(subscriptionId);
  if (!sub) throw new Error('Subscription not found');
  if (sub.paymentStatus === 'confirmed' && sub.isActive) return sub;

  sub.paymentStatus = 'confirmed';
  sub.isActive = true;
  if (txHash) sub.cryptoTxHash = txHash;
  if (adminNote) sub.adminNote = adminNote;
  if (confirmedBy) sub.grantedBy = confirmedBy;
  await sub.save();

  // Activate on user (deactivate other active subs first)
  await Subscription.updateMany(
    { user: sub.user, isActive: true, _id: { $ne: sub._id } },
    { isActive: false, cancelledAt: new Date(), cancelReason: 'Replaced by confirmed payment' }
  );

  await User.findByIdAndUpdate(sub.user, {
    'subscription.plan': sub.plan,
    'subscription.billingCycle': sub.billingCycle,
    'subscription.startDate': sub.startDate,
    'subscription.endDate': sub.endDate,
    'subscription.isActive': true,
    'subscription.autoRenew': sub.autoRenew,
  });

  return sub;
}

/**
 * Cancel a user's active subscription. Downgrade to free.
 */
async function cancelSubscription(userId, reason = 'User cancelled') {
  await Subscription.findOneAndUpdate(
    { user: userId, isActive: true },
    { isActive: false, cancelledAt: new Date(), cancelReason: reason, autoRenew: false }
  );

  await User.findByIdAndUpdate(userId, {
    'subscription.plan': 'free',
    'subscription.billingCycle': 'monthly',
    'subscription.isActive': true,
    'subscription.autoRenew': false,
    'subscription.endDate': null,
  });
}

/**
 * Cron job: expire subscriptions whose endDate has passed.
 * If autoRenew is true, attempts renewal (creates a new pending sub for the same plan).
 * Otherwise downgrades user to 'free' plan.
 */
async function expireSubscriptions() {
  const now = new Date();
  const expiring = await Subscription.find({ isActive: true, endDate: { $lt: now } });

  let expired = 0;
  let renewed = 0;
  for (const sub of expiring) {
    sub.isActive = false;
    sub.expiredAt = now;
    await sub.save();

    // Auto-renew: create a new pending subscription for the same plan
    // Admin still has to confirm payment for crypto/mobile money flows.
    if (sub.autoRenew && sub.plan !== 'free') {
      try {
        await renewSubscription(sub);
        renewed++;
        continue;
      } catch (err) {
        console.error(`⚠️  Auto-renewal failed for sub ${sub._id}:`, err.message);
      }
    }

    // Otherwise downgrade user (unless they have another active sub)
    const otherActive = await Subscription.findOne({ user: sub.user, isActive: true, _id: { $ne: sub._id } });
    if (!otherActive) {
      await User.findByIdAndUpdate(sub.user, {
        'subscription.plan': 'free',
        'subscription.isActive': true,
        'subscription.endDate': null,
        'subscription.autoRenew': false,
      });
    }
    expired++;
  }

  if (expired > 0) console.log(`⏰ Expired ${expired} subscriptions`);
  if (renewed > 0) console.log(`🔄 Auto-renewed ${renewed} subscriptions (pending payment)`);
  return { expired, renewed };
}

/**
 * Create a pending renewal subscription for the same plan.
 * For crypto/mobile money: admin must confirm the new payment.
 * For free/admin-granted: instantly active.
 */
async function renewSubscription(prevSub) {
  const plan = planCache.getPlan(prevSub.plan);
  if (!plan) throw new Error(`Plan '${prevSub.plan}' not found`);

  const amount = prevSub.billingCycle === 'yearly' ? (plan.priceYearly || 0) : (plan.priceMonthly || 0);
  const startDate = new Date();
  const endDate = new Date(startDate);
  if (prevSub.billingCycle === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);
  else if (prevSub.billingCycle === 'lifetime') endDate.setFullYear(2099);
  else endDate.setMonth(endDate.getMonth() + 1);

  const newSub = await Subscription.create({
    user: prevSub.user,
    plan: prevSub.plan,
    billingCycle: prevSub.billingCycle,
    amount,
    currency: prevSub.currency || 'USD',
    paymentMethod: prevSub.paymentMethod,
    paymentStatus: 'pending',
    isActive: false,
    autoRenew: true,
    startDate,
    endDate,
    renewedFrom: prevSub._id,
    adminNote: 'Renouvellement automatique — en attente du nouveau paiement',
  });
  return newSub;
}

/**
 * Cron job: reset daily / monthly usage counters.
 */
async function resetUsageCounters() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  await User.updateMany(
    { 'subscription.usage.lastTradeReset': { $lt: todayStart } },
    { $set: { 'subscription.usage.tradesToday': 0, 'subscription.usage.lastTradeReset': now } }
  );
  await User.updateMany(
    { 'subscription.usage.lastBacktestReset': { $lt: monthStart } },
    { $set: { 'subscription.usage.backtestsThisMonth': 0, 'subscription.usage.lastBacktestReset': now } }
  );
}

/**
 * Compute revenue & churn metrics.
 */
async function getRevenueStats() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const last60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [
    activeCount,
    monthlyRevenue,
    yearlyRevenue,
    totalRevenue,
    perPlan,
    cancelledLast30,
    activeLast60,
    pendingCount,
  ] = await Promise.all([
    Subscription.countDocuments({ isActive: true, paymentStatus: 'confirmed' }),
    Subscription.aggregate([
      { $match: { paymentStatus: 'confirmed', createdAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Subscription.aggregate([
      { $match: { paymentStatus: 'confirmed', createdAt: { $gte: yearStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Subscription.aggregate([
      { $match: { paymentStatus: 'confirmed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Subscription.aggregate([
      { $match: { isActive: true, paymentStatus: 'confirmed' } },
      { $group: { _id: '$plan', count: { $sum: 1 }, revenue: { $sum: '$amount' } } },
    ]),
    Subscription.countDocuments({ cancelledAt: { $gte: last30 } }),
    Subscription.countDocuments({ isActive: true, createdAt: { $lt: last30, $gte: last60 } }),
    Subscription.countDocuments({ paymentStatus: 'pending' }),
  ]);

  // Churn rate over last 30d = cancelled / active 30-60 days ago
  const churnRate = activeLast60 > 0 ? (cancelledLast30 / activeLast60) * 100 : 0;

  // MRR — sum of currently active monthly equivalents
  const mrrAgg = await Subscription.aggregate([
    { $match: { isActive: true, paymentStatus: 'confirmed' } },
    {
      $project: {
        monthlyValue: {
          $cond: [
            { $eq: ['$billingCycle', 'yearly'] },
            { $divide: ['$amount', 12] },
            { $cond: [{ $eq: ['$billingCycle', 'lifetime'] }, 0, '$amount'] },
          ],
        },
      },
    },
    { $group: { _id: null, mrr: { $sum: '$monthlyValue' } } },
  ]);

  return {
    activeSubscriptions: activeCount,
    pendingPayments: pendingCount,
    monthlyRevenue: monthlyRevenue[0]?.total || 0,
    yearlyRevenue: yearlyRevenue[0]?.total || 0,
    totalRevenue: totalRevenue[0]?.total || 0,
    mrr: Math.round((mrrAgg[0]?.mrr || 0) * 100) / 100,
    arr: Math.round((mrrAgg[0]?.mrr || 0) * 12 * 100) / 100,
    churnRate: Math.round(churnRate * 100) / 100,
    perPlan,
  };
}

/**
 * Start cron jobs.
 */
function startCron() {
  // Run every hour
  setInterval(async () => {
    try {
      await expireSubscriptions();
      await resetUsageCounters();
    } catch (err) {
      console.error('⚠️  Subscription cron error:', err.message);
    }
  }, 60 * 60 * 1000);

  // Run once at startup (after a short delay to let DB connect fully)
  setTimeout(async () => {
    try {
      await expireSubscriptions();
      await resetUsageCounters();
    } catch (err) {
      console.error('⚠️  Subscription startup cron error:', err.message);
    }
  }, 10 * 1000);
}

module.exports = {
  activateSubscription,
  confirmPendingSubscription,
  cancelSubscription,
  expireSubscriptions,
  renewSubscription,
  resetUsageCounters,
  getRevenueStats,
  startCron,
};
