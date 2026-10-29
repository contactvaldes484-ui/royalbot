const express = require('express');
const Bot = require('../models/Bot');
const Order = require('../models/Order');
const User = require('../models/User');
const VendorProfile = require('../models/VendorProfile');
const Withdrawal = require('../models/Withdrawal');
const { authenticate, requireVendor } = require('../middleware/auth');

const router = express.Router();

// Public/authenticated: apply to become vendor (creates or updates VendorProfile with pending status)
router.post('/apply', authenticate, async (req, res) => {
  try {
    const { displayName, bio, payoutMethod, payoutDetails } = req.body;
    if (!displayName) return res.status(400).json({ error: 'displayName is required' });

    let profile = await VendorProfile.findOne({ user: req.user._id });
    if (!profile) {
      const baseSlug = displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const existing = await VendorProfile.findOne({ slug: baseSlug });
      const slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug;

      profile = await VendorProfile.create({
        user: req.user._id,
        displayName,
        slug,
        bio: bio || '',
        payoutMethod: payoutMethod || 'crypto',
        payoutDetails: payoutDetails || {},
        status: 'pending',
      });
    } else {
      profile.displayName = displayName;
      profile.bio = bio || profile.bio;
      if (payoutMethod) profile.payoutMethod = payoutMethod;
      if (payoutDetails) profile.payoutDetails = payoutDetails;
      const baseSlug = displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (!profile.slug || !profile.slug.startsWith(baseSlug)) {
        const existing = await VendorProfile.findOne({ slug: baseSlug, _id: { $ne: profile._id } });
        profile.slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug;
      }
      profile.status = 'pending';
      await profile.save();
    }

    await User.findByIdAndUpdate(req.user._id, {
      'vendor.profile': profile._id,
    });

    res.json({ profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vendor-only routes
router.use(authenticate, requireVendor);

// Get vendor profile + basic stats
router.get('/profile', async (req, res) => {
  try {
    const profile = await VendorProfile.findOne({ user: req.user._id });
    const freshUser = await User.findById(req.user._id).select('vendorEarnings vendorAvailable vendorPaidOut');

    res.json({
      profile,
      earnings: {
        total: freshUser?.vendorEarnings || 0,
        available: freshUser?.vendorAvailable || 0,
        paidOut: freshUser?.vendorPaidOut || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List vendor robots
router.get('/robots', async (req, res) => {
  try {
    const robots = await Bot.find({ vendor: req.user._id }).sort({ createdAt: -1 });
    res.json({ robots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new robot (listing) - Seul l'administrateur a le droit d'ajouter des robots MT4/MT5 dans la marketplace
router.post('/robots', async (req, res) => {
  try {
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        error: 'Seul l\'administrateur de RoyalBot a le droit de publier des robots MT4/MT5 dans la marketplace.'
      });
    }

    const {
      name,
      tier,
      description,
      platforms,
      supportedContracts,
      supportedSymbols,
      defaultSettings,
      mt5Settings,
      features,
      price,
      billingCycle,
      // commissionRate is intentionally ignored here; only admins can set it
      minCapital,
      minTradeAmount,
      icon,
      color,
      badge,
      isPopular,
      robotFile,
      robotFileName,
      robotFileType,
      isUploaded,
      screenshots,
      videoUrls,
      accessType,
    } = req.body;

    if (!name || !tier) return res.status(400).json({ error: 'name and tier are required' });

    const maxBytes = 2 * 1024 * 1024;
    if (robotFile && typeof robotFile === 'string') {
      const approxBytes = Math.floor(robotFile.length * 0.75);
      if (approxBytes > maxBytes) {
        return res.status(400).json({ error: 'Robot file too large (max 2MB).' });
      }
    }

    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = await Bot.findOne({ slug: baseSlug });
    const slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug;

    const count = await Bot.countDocuments({ vendor: req.user._id });
    const bot = await Bot.create({
      name,
      slug,
      tier,
      description,
      platforms: platforms || ['mt5'],
      supportedContracts: supportedContracts || [],
      supportedSymbols: supportedSymbols || [],
      defaultSettings: defaultSettings || {},
      mt5Settings: mt5Settings || {},
      features: features || [],
      price: price || 0,
      billingCycle: billingCycle || 'monthly',
      commissionRate: 0,
      accessType: accessType || 'purchase',
      minCapital: minCapital || 0,
      minTradeAmount: minTradeAmount || 0.35,
      icon: icon || 'Bot',
      color: color || '#8b5cf6',
      badge: badge || tier,
      isPopular: !!isPopular,
      order: count,
      robotFile: robotFile || '',
      robotFileName: robotFileName || '',
      robotFileType: robotFileType || '',
      isUploaded: !!isUploaded,
      vendor: req.user._id,
      listingStatus: 'pending',
      securityStatus: 'pending',
      screenshots: screenshots || [],
      videoUrls: videoUrls || [],
    });

    // Increment totalRobots on VendorProfile
    await VendorProfile.findOneAndUpdate(
      { user: req.user._id },
      { $inc: { totalRobots: 1 } },
      { new: true }
    );

    res.status(201).json({ bot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update an existing vendor robot
router.put('/robots/:id', async (req, res) => {
  try {
    const bot = await Bot.findById(req.params.id);
    if (!bot) return res.status(404).json({ error: 'Robot not found' });
    if (!bot.vendor || bot.vendor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Vous ne pouvez modifier que vos propres robots.' });
    }

    // Prevent vendor from changing restricted fields
    const disallowed = ['vendor', 'listingStatus', 'securityStatus', 'securityNotes', 'ratingAverage', 'ratingCount', 'totalUsers', 'commissionRate'];
    disallowed.forEach(field => { if (field in req.body) delete req.body[field]; });

    if (req.body.name && req.body.name !== bot.name) {
      const baseSlug = req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const existing = await Bot.findOne({ slug: baseSlug, _id: { $ne: bot._id } });
      req.body.slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug;
    }

    const updated = await Bot.findByIdAndUpdate(bot._id, req.body, { new: true, runValidators: true });
    res.json({ bot: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vendor earnings & sales stats
router.get('/earnings', async (req, res) => {
  try {
    const freshUser = await User.findById(req.user._id).select('vendorEarnings vendorAvailable vendorPaidOut');
    const orders = await Order.find({ paymentStatus: 'confirmed', 'items.vendor': req.user._id }).select('items');

    let totalSales = 0;
    let totalGross = 0;
    let totalVendorRevenue = 0;

    for (const order of orders) {
      for (const item of order.items) {
        if (item.vendor && item.vendor.toString() === req.user._id.toString()) {
          totalSales += 1;
          totalGross += item.price || 0;
          totalVendorRevenue += item.vendorRevenue || 0;
        }
      }
    }

    res.json({
      earnings: {
        total: freshUser?.vendorEarnings || 0,
        available: freshUser?.vendorAvailable || 0,
        paidOut: freshUser?.vendorPaidOut || 0,
      },
      stats: {
        totalSales,
        totalGross,
        totalVendorRevenue,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vendor withdrawal requests (payouts from vendorAvailable)
router.post('/withdrawals', async (req, res) => {
  try {
    const { amount, method, walletAddress } = req.body;
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({ error: 'Montant invalide.' });
    }
    if (!method) {
      return res.status(400).json({ error: 'Méthode de paiement requise.' });
    }

    const user = await User.findById(req.user._id).select('vendorAvailable vendorEarnings vendorPaidOut');
    const available = user?.vendorAvailable || 0;
    if (available < numericAmount) {
      return res.status(400).json({ error: 'Montant supérieur à votre solde vendeur disponible.' });
    }

    const withdrawal = await Withdrawal.create({
      user: req.user._id,
      source: 'vendor',
      amount: numericAmount,
      commission: 0,
      commissionRate: 0,
      netAmount: numericAmount,
      method,
      walletAddress,
      status: 'pending',
      notes: 'Marketplace vendor payout',
    });

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { vendorAvailable: -numericAmount },
    });

    res.status(201).json({ withdrawal, message: 'Demande de retrait vendeur envoyée.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List vendor withdrawals
router.get('/withdrawals', async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ user: req.user._id, source: 'vendor' }).sort({ createdAt: -1 });
    res.json({ withdrawals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
