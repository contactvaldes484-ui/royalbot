const express = require('express');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { authenticate, requireAdmin } = require('../middleware/auth');
const planCache = require('../services/planCache');
const subService = require('../services/subscriptionService');

const router = express.Router();

router.use(authenticate, requireAdmin);

// ─── Plans CRUD ──────────────────────────────────────────────────────────────

// List ALL plans (incl. hidden)
router.get('/plans', async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find().sort({ tier: 1, order: 1 });
    res.json({ plans });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single plan
router.get('/plans/:id', async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan introuvable.' });
    res.json({ plan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create plan
router.post('/plans', async (req, res) => {
  try {
    const { slug, name } = req.body;
    if (!slug || !name) return res.status(400).json({ error: 'slug et name requis.' });

    const existing = await SubscriptionPlan.findOne({ slug });
    if (existing) return res.status(409).json({ error: 'Slug déjà utilisé.' });

    const plan = await SubscriptionPlan.create(req.body);
    await planCache.refreshCache();
    res.status(201).json({ plan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update plan
router.put('/plans/:id', async (req, res) => {
  try {
    const update = { ...req.body };
    delete update._id;
    delete update.createdAt;
    delete update.updatedAt;

    const plan = await SubscriptionPlan.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!plan) return res.status(404).json({ error: 'Plan introuvable.' });
    await planCache.refreshCache();
    res.json({ plan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Quick toggle Plan Active status
router.post('/plans/:id/toggle-active', async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan introuvable.' });
    plan.isActive = !plan.isActive;
    await plan.save();
    await planCache.refreshCache();
    res.json({ success: true, plan });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Quick toggle Referral Activation
router.post('/plans/:id/toggle-referral', async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan introuvable.' });
    plan.referralEligible = !plan.referralEligible;
    await plan.save();
    await planCache.refreshCache();
    res.json({ success: true, plan });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Quick toggle Paid Subscription Activation
router.post('/plans/:id/toggle-payment', async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan introuvable.' });
    plan.allowPaidSubscription = plan.allowPaidSubscription === false ? true : false;
    await plan.save();
    await planCache.refreshCache();
    res.json({ success: true, plan });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete plan (only if no active subscriptions linked)
router.delete('/plans/:id', async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan introuvable.' });

    const activeCount = await Subscription.countDocuments({ plan: plan.slug, isActive: true });
    if (activeCount > 0) {
      return res.status(409).json({
        error: `Impossible de supprimer : ${activeCount} abonnement(s) actif(s) sur ce plan.`,
      });
    }

    await SubscriptionPlan.deleteOne({ _id: plan._id });
    await planCache.refreshCache();
    res.json({ message: 'Plan supprimé.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset plans to defaults (DESTRUCTIVE — super_admin only)
router.post('/plans/reset-defaults', async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Super admin requis.' });
    }
    const defaultPlans = require('../config/defaultPlans');
    await SubscriptionPlan.deleteMany({});
    await SubscriptionPlan.insertMany(defaultPlans);
    await planCache.refreshCache();
    res.json({ message: 'Plans réinitialisés.', count: defaultPlans.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Revenue stats ───────────────────────────────────────────────────────────

router.get('/revenue/stats', async (req, res) => {
  try {
    const stats = await subService.getRevenueStats();
    res.json({ stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Confirm pending subscription (admin validates payment) ──────────────────

router.post('/subscriptions/:id/confirm', async (req, res) => {
  try {
    const { txHash, adminNote } = req.body;
    const sub = await subService.confirmPendingSubscription(req.params.id, {
      txHash,
      adminNote,
      confirmedBy: req.user._id,
    });
    res.json({ subscription: sub, message: 'Paiement confirmé et abonnement activé.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject pending subscription
router.post('/subscriptions/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const sub = await Subscription.findByIdAndUpdate(
      req.params.id,
      { paymentStatus: 'failed', isActive: false, cancelledAt: new Date(), cancelReason: reason || 'Paiement rejeté par admin' },
      { new: true }
    );
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });
    res.json({ subscription: sub, message: 'Paiement rejeté.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── User role management (RBAC) ─────────────────────────────────────────────

const VALID_ROLES = ['user', 'premium', 'vip', 'admin', 'super_admin'];

router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Rôle invalide.' });

    // Only super_admin can promote to admin or super_admin
    if (['admin', 'super_admin'].includes(role) && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Seul un super_admin peut accorder ce rôle.' });
    }

    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    // Cannot demote a super_admin unless you're a super_admin yourself
    if (target.role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Impossible de modifier un super_admin.' });
    }

    target.role = role;
    await target.save();
    res.json({ user: target.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
