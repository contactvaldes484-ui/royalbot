const express = require('express');
const rateLimit = require('express-rate-limit');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const planCache = require('../services/planCache');
const subService = require('../services/subscriptionService');
const sebpay = require('../services/sebpayService');
const usdtVerifier = require('../services/usdtVerifier');

const router = express.Router();

// Anti-fraud: limit subscribe attempts (max 5 per 15 min per IP)
const subscribeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Trop de tentatives d\'abonnement. Réessayez plus tard.' },
});

// ─── Public: list plans ──────────────────────────────────────────────────────
router.get('/plans', (req, res) => {
  const plans = planCache.getPublicPlans();
  res.json({ plans });
});

// ─── Public: get single plan ─────────────────────────────────────────────────
router.get('/plans/:slug', (req, res) => {
  const plan = planCache.getPlan(req.params.slug);
  if (!plan || plan.isPublic === false) {
    return res.status(404).json({ error: 'Plan introuvable.' });
  }
  res.json({ plan });
});

// ─── Public: payment options (USDT address, mobile money availability) ───────
router.get('/payment-options', (req, res) => {
  res.json({
    usdt: {
      enabled: !!usdtVerifier.receivingAddress(),
      network: 'TRC-20 (TRON)',
      address: usdtVerifier.receivingAddress() || null,
      autoVerify: usdtVerifier.isConfigured(),
    },
    mobileMoney: {
      enabled: sebpay.isConfigured(),
      xofPerUsd: sebpay.xofPerUsd(),
    },
  });
});

// ─── Public: mobile money operators (proxy SebPay) ───────────────────────────
router.get('/mobile-operators', async (req, res) => {
  try {
    if (!sebpay.isConfigured()) return res.json({ operators: [] });
    const operators = await sebpay.listOperators(req.query.country);
    res.json({ operators });
  } catch (err) {
    res.status(200).json({ operators: [], error: err.message });
  }
});

// ─── User: get current subscription ──────────────────────────────────────────
router.get('/current', authenticate, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ user: req.user._id, isActive: true })
      .sort({ createdAt: -1 });

    const planSlug = req.user.subscription?.plan || 'free';
    const plan = planCache.getPlan(planSlug);

    res.json({
      subscription,
      plan,
      planSlug,
      userSubscription: req.user.subscription,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── User: subscribe to a plan (Crypto / Mobile Money) ───────────────────────
router.post('/subscribe', authenticate, subscribeLimiter, async (req, res) => {
  try {
    const {
      planSlug,
      billingCycle = 'monthly',
      paymentMethod,
      // Crypto
      cryptoTxHash, cryptoWallet, cryptoCurrency,
      // Mobile money
      mobileMoneyProvider, mobileMoneyNumber, mobileMoneyTxRef,
      mobileMoneyCountry, mobileMoneyOtp,
      // Proof of payment (fallback manuel)
      proofImage,
    } = req.body;

    if (!planSlug) return res.status(400).json({ error: 'planSlug requis.' });
    const plan = planCache.getPlan(planSlug);
    if (!plan) return res.status(400).json({ error: 'Plan invalide.' });

    if (!['monthly', 'yearly', 'lifetime'].includes(billingCycle)) {
      return res.status(400).json({ error: 'billingCycle invalide.' });
    }

    const validMethods = ['usdt_tron', 'binance_pay', 'crypto', 'mobile_money'];
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: 'paymentMethod invalide. Utilisez crypto ou mobile_money.' });
    }

    // Free plan: instant activation
    if (planSlug === 'free' || plan.tier === 0) {
      const sub = await subService.activateSubscription({
        userId: req.user._id,
        planSlug: 'free',
        billingCycle: 'monthly',
        amount: 0,
        paymentMethod: 'manual',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      return res.json({ subscription: sub, message: 'Plan gratuit activé.' });
    }

    // Compute amount based on billing cycle
    const amount = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
    if (amount <= 0) {
      return res.status(400).json({ error: 'Prix invalide pour ce plan.' });
    }

    // Create pending subscription (activée après confirmation auto / webhook / admin)
    const startDate = new Date();
    let endDate = new Date(startDate);
    if (billingCycle === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);
    else endDate.setMonth(endDate.getMonth() + 1);

    const sub = await Subscription.create({
      user: req.user._id,
      plan: planSlug,
      billingCycle,
      amount,
      currency: plan.currency || 'USD',
      paymentMethod,
      paymentStatus: 'pending',
      isActive: false,
      cryptoTxHash, cryptoWallet, cryptoCurrency,
      mobileMoneyProvider, mobileMoneyNumber, mobileMoneyTxRef,
      proofImage,
      startDate, endDate,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // ── Mobile Money : encaissement automatique via SebPay ──
    if (paymentMethod === 'mobile_money') {
      if (sebpay.isConfigured()) {
        if (!mobileMoneyNumber || !mobileMoneyProvider) {
          await Subscription.deleteOne({ _id: sub._id });
          return res.status(400).json({ error: 'Numéro et opérateur Mobile Money requis.' });
        }
        try {
          const collection = await sebpay.initCollection({
            amountUsd: amount,
            phone: mobileMoneyNumber,
            operator: mobileMoneyProvider,
            country: mobileMoneyCountry || 'BJ',
            externalRef: `sub_${sub._id}`,
            otpCode: mobileMoneyOtp,
          });
          sub.paymentId = collection.transactionId;
          sub.mobileMoneyTxRef = collection.transactionId;
          await sub.save();
          return res.json({
            subscription: sub,
            message: 'Demande de paiement Mobile Money envoyée. Validez sur votre téléphone.',
            providerLink: collection.providerLink,
            amountXof: collection.amount,
            pendingValidation: true,
          });
        } catch (err) {
          await Subscription.deleteOne({ _id: sub._id });
          return res.status(502).json({ error: `Échec de l'initiation du paiement Mobile Money: ${err.message}` });
        }
      }
      // Fallback manuel (clés SebPay absentes) : preuve requise, validation admin.
      if (!mobileMoneyTxRef) {
        await Subscription.deleteOne({ _id: sub._id });
        return res.status(400).json({ error: 'Référence de transaction Mobile Money requise.' });
      }
      return res.json({
        subscription: sub,
        message: 'Paiement en attente de validation par un administrateur.',
        pendingValidation: true,
      });
    }

    // ── USDT / crypto : auto-vérif on-chain si un hash est fourni ──
    if (['usdt_tron', 'crypto'].includes(paymentMethod) && cryptoTxHash && usdtVerifier.isConfigured()) {
      const dup = await Subscription.findOne({ _id: { $ne: sub._id }, cryptoTxHash, paymentStatus: 'confirmed' });
      if (dup) {
        await Subscription.deleteOne({ _id: sub._id });
        return res.status(409).json({ error: 'Ce hash de transaction a déjà été utilisé.' });
      }
      const check = await usdtVerifier.verifyPayment({ txHash: cryptoTxHash, expectedUsd: amount });
      if (check.ok) {
        const confirmed = await subService.confirmPendingSubscription(sub._id, {
          txHash: cryptoTxHash, adminNote: 'Confirmé automatiquement (USDT on-chain)',
        });
        return res.json({ subscription: confirmed, message: 'Paiement USDT confirmé, abonnement activé.', confirmed: true });
      }
      // sinon on laisse en attente (l'utilisateur pourra relancer /verify-usdt)
    }

    res.json({
      subscription: sub,
      message: 'Abonnement en attente de paiement.',
      usdtAddress: ['usdt_tron', 'crypto'].includes(paymentMethod) ? usdtVerifier.receivingAddress() : undefined,
      pendingValidation: true,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── User: verify a USDT payment on-chain for a pending subscription ─────────
router.post('/:id/verify-usdt', authenticate, async (req, res) => {
  try {
    const { txHash } = req.body;
    if (!txHash) return res.status(400).json({ error: 'txHash requis.' });

    const sub = await Subscription.findOne({ _id: req.params.id, user: req.user._id });
    if (!sub) return res.status(404).json({ error: 'Abonnement introuvable.' });
    if (sub.paymentStatus === 'confirmed' && sub.isActive) {
      return res.json({ subscription: sub, message: 'Abonnement déjà actif.', confirmed: true });
    }
    if (!usdtVerifier.isConfigured()) {
      return res.status(503).json({ error: 'Vérification USDT automatique indisponible. Un admin validera votre paiement.' });
    }

    // Empêche la réutilisation d'un hash déjà consommé
    const dup = await Subscription.findOne({ _id: { $ne: sub._id }, cryptoTxHash: txHash, paymentStatus: 'confirmed' });
    if (dup) return res.status(409).json({ error: 'Ce hash de transaction a déjà été utilisé.' });

    const check = await usdtVerifier.verifyPayment({ txHash, expectedUsd: sub.amount });
    if (!check.ok) {
      return res.status(402).json({ error: check.reason || 'Paiement USDT non confirmé.', auto: check.auto });
    }

    const confirmed = await subService.confirmPendingSubscription(sub._id, {
      txHash, adminNote: 'Confirmé automatiquement (USDT on-chain)',
    });
    res.json({ subscription: confirmed, message: 'Paiement USDT confirmé, abonnement activé.', confirmed: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── User: toggle auto-renew on active subscription ─────────────────────────
router.post('/auto-renew', authenticate, async (req, res) => {
  try {
    const { autoRenew } = req.body;
    const sub = await Subscription.findOneAndUpdate(
      { user: req.user._id, isActive: true },
      { autoRenew: !!autoRenew },
      { new: true }
    );
    if (!sub) return res.status(404).json({ error: 'Aucun abonnement actif.' });

    await User.findByIdAndUpdate(req.user._id, { 'subscription.autoRenew': !!autoRenew });
    res.json({ subscription: sub, autoRenew: !!autoRenew });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── User: cancel subscription ───────────────────────────────────────────────
router.post('/cancel', authenticate, async (req, res) => {
  try {
    const { reason } = req.body;
    await subService.cancelSubscription(req.user._id, reason || 'Annulé par l\'utilisateur');
    res.json({ message: 'Abonnement annulé. Compte rétrogradé au plan gratuit.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── User: subscription history (invoices) ──────────────────────────────────
router.get('/history', authenticate, async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ subscriptions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── User: usage stats ──────────────────────────────────────────────────────
router.get('/usage', authenticate, async (req, res) => {
  try {
    const planSlug = req.user.subscription?.plan || 'free';
    const plan = planCache.getPlan(planSlug);
    const usage = req.user.subscription?.usage || {};

    res.json({
      planSlug,
      plan,
      usage,
      limits: plan?.limits || {},
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── User: upgrade preview ──────────────────────────────────────────────────
router.get('/upgrade-preview/:planSlug', authenticate, (req, res) => {
  const targetPlan = planCache.getPlan(req.params.planSlug);
  if (!targetPlan) return res.status(404).json({ error: 'Plan introuvable.' });

  const currentPlanSlug = req.user.subscription?.plan || 'free';
  const currentPlan = planCache.getPlan(currentPlanSlug);

  const isUpgrade = targetPlan.tier > (currentPlan?.tier || 0);
  const isDowngrade = targetPlan.tier < (currentPlan?.tier || 0);

  res.json({
    currentPlan,
    targetPlan,
    isUpgrade,
    isDowngrade,
    monthlyDiff: (targetPlan.priceMonthly || 0) - (currentPlan?.priceMonthly || 0),
    yearlyDiff: (targetPlan.priceYearly || 0) - (currentPlan?.priceYearly || 0),
  });
});

module.exports = router;
