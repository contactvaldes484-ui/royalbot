const express = require('express');
const User = require('../models/User');
const Bot = require('../models/Bot');
const Trade = require('../models/Trade');
const Subscription = require('../models/Subscription');
const Withdrawal = require('../models/Withdrawal');
const BotSession = require('../models/BotSession');
const ProfitScreenshot = require('../models/ProfitScreenshot');
const PlatformSettings = require('../models/PlatformSettings');
const Order = require('../models/Order');
const SecurityLog = require('../models/SecurityLog');
const VendorProfile = require('../models/VendorProfile');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// Platform stats
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const premiumUsers = await User.countDocuments({ 'subscription.plan': { $in: ['premium', 'vip'] } });
    const totalTrades = await Trade.countDocuments();
    const totalProfit = await Trade.aggregate([{ $group: { _id: null, total: { $sum: '$profit' } } }]);
    const totalRevenue = await Subscription.aggregate([{ $match: { isActive: true } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    const totalCommissions = await Withdrawal.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$commission' } } }]);
    const pendingWithdrawals = await Withdrawal.countDocuments({ status: 'pending' });
    const activeSessions = await BotSession.countDocuments({ status: 'running' });

    res.json({
      totalUsers,
      activeUsers,
      premiumUsers,
      totalTrades,
      totalProfit: totalProfit[0]?.total || 0,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalCommissions: totalCommissions[0]?.total || 0,
      pendingWithdrawals,
      activeSessions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Vendor management ───────────────────────────────────────────────────────

// List vendors (users with vendor profile or earnings)
router.get('/vendors', async (req, res) => {
  try {
    const profiles = await VendorProfile.find().populate('user', 'firstName lastName email vendorEarnings vendorAvailable vendorPaidOut');
    res.json({ vendors: profiles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve a vendor application
router.put('/vendors/:id/approve', async (req, res) => {
  try {
    const profile = await VendorProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Vendor profile not found' });

    profile.status = 'approved';
    profile.rejectionReason = '';
    await profile.save();

    await User.findByIdAndUpdate(profile.user, {
      'vendor.isVendor': true,
      'vendor.profile': profile._id,
    });

    res.json({ profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject a vendor application
router.put('/vendors/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const profile = await VendorProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Vendor profile not found' });

    profile.status = 'rejected';
    profile.rejectionReason = reason || '';
    await profile.save();

    await User.findByIdAndUpdate(profile.user, {
      'vendor.isVendor': false,
    });

    res.json({ profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, plan, status } = req.query;
    const query = {};
    if (search) query.$or = [
      { firstName: new RegExp(search, 'i') },
      { lastName: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') }
    ];
    if (plan) query['subscription.plan'] = plan;
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;

    const users = await User.find(query)
      .select('-password -twoFactorSecret')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({ users, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user
router.put('/users/:id', async (req, res) => {
  try {
    const { isActive, role, subscription } = req.body;
    const updates = {};
    if (isActive !== undefined) updates.isActive = isActive;
    if (role) updates.role = role;
    if (subscription) updates.subscription = subscription;

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manage bots
router.put('/bots/:id', async (req, res) => {
  try {
    const bot = await Bot.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ bot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all withdrawals
router.get('/withdrawals', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const withdrawals = await Withdrawal.find(query)
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Withdrawal.countDocuments(query);
    res.json({ withdrawals, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Process withdrawal
router.put('/withdrawals/:id', async (req, res) => {
  try {
    const { status, rejectionReason, transactionHash } = req.body;
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal) return res.status(404).json({ error: 'Demande de retrait introuvable.' });

    const prevStatus = withdrawal.status;

    if (status) withdrawal.status = status;
    withdrawal.processedAt = new Date();
    if (rejectionReason) withdrawal.rejectionReason = rejectionReason;
    if (transactionHash) withdrawal.transactionHash = transactionHash;

    await withdrawal.save();

    // Sync vendor balances for marketplace payouts
    if (withdrawal.source === 'vendor') {
      if ((prevStatus === 'pending' || prevStatus === 'processing') && withdrawal.status === 'completed') {
        await User.findByIdAndUpdate(withdrawal.user, {
          $inc: { vendorPaidOut: withdrawal.amount }
        });
      }
      if ((prevStatus === 'pending' || prevStatus === 'processing') && withdrawal.status === 'rejected') {
        await User.findByIdAndUpdate(withdrawal.user, {
          $inc: { vendorAvailable: withdrawal.amount }
        });
      }
    }

    res.json({ withdrawal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send global notification
router.post('/notifications', async (req, res) => {
  try {
    const { title, message, type } = req.body;
    // Broadcast to all connected users
    if (global.wss) {
      global.wss.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({ type: 'notification', data: { title, message, notificationType: type } }));
        }
      });
    }
    res.json({ message: 'Notification sent to all connected users.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Revenue report
router.get('/revenue', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const days = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }[period] || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const subscriptionRevenue = await Subscription.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const commissionRevenue = await Withdrawal.aggregate([
      { $match: { createdAt: { $gte: startDate }, status: 'completed' } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$commission' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({ subscriptionRevenue, commissionRevenue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Subscription management ──────────────────────────────────────────────────

// List all subscriptions (with user info)
router.get('/subscriptions', async (req, res) => {
  try {
    const { page = 1, limit = 20, plan, status, method } = req.query;
    const query = {};
    if (plan) query.plan = plan;
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;
    if (method) query.paymentMethod = method;

    const subscriptions = await Subscription.find(query)
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Subscription.countDocuments(query);
    res.json({ subscriptions, pagination: { page: parseInt(page), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Grant / update a subscription for a user (admin override)
router.post('/subscriptions/grant', async (req, res) => {
  try {
    const { userId, plan, durationDays = 30, adminNote } = req.body;
    if (!userId || !plan) return res.status(400).json({ error: 'userId and plan are required' });

    const endDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    // Deactivate previous active subscriptions
    await Subscription.updateMany({ user: userId, isActive: true }, { isActive: false, cancelledAt: new Date(), cancelReason: 'Replaced by admin' });

    const sub = await Subscription.create({
      user: userId, plan, endDate, isActive: true,
      paymentMethod: 'stripe', amount: 0,
      grantedByAdmin: true, adminNote: adminNote || 'Accordé par l\'administrateur',
    });

    // Also update user subscription field
    await User.findByIdAndUpdate(userId, {
      'subscription.plan': plan,
      'subscription.startDate': new Date(),
      'subscription.endDate': endDate,
      'subscription.isActive': true,
    });

    res.json({ subscription: sub });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle subscription active/inactive
router.put('/subscriptions/:id/toggle', async (req, res) => {
  try {
    const sub = await Subscription.findById(req.params.id).populate('user', '_id');
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    sub.isActive = !sub.isActive;
    if (!sub.isActive) { sub.cancelledAt = new Date(); sub.cancelReason = 'Désactivé par l\'administrateur'; }
    await sub.save();

    // Sync user subscription status
    await User.findByIdAndUpdate(sub.user._id, { 'subscription.isActive': sub.isActive });

    res.json({ subscription: sub });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change subscription plan
router.put('/subscriptions/:id/plan', async (req, res) => {
  try {
    const { plan } = req.body;
    const planCache = require('../services/planCache');
    if (!planCache.getPlan(plan)) return res.status(400).json({ error: 'Invalid plan' });

    const sub = await Subscription.findByIdAndUpdate(req.params.id, { plan }, { new: true }).populate('user', '_id');
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    await User.findByIdAndUpdate(sub.user._id, { 'subscription.plan': plan });
    res.json({ subscription: sub });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Confirm a pending crypto payment (USDT Tron / BinancePay)
router.put('/subscriptions/:id/confirm-payment', async (req, res) => {
  try {
    const { txHash, adminNote } = req.body;
    const sub = await Subscription.findByIdAndUpdate(
      req.params.id,
      { paymentStatus: 'confirmed', isActive: true, cryptoTxHash: txHash, adminNote },
      { new: true }
    ).populate('user', '_id');
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });
    await User.findByIdAndUpdate(sub.user._id, { 'subscription.plan': sub.plan, 'subscription.isActive': true });
    res.json({ subscription: sub });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Profit Screenshots Management (Marketing) ──────────────────────────────

// List all screenshots (admin)
router.get('/screenshots', async (req, res) => {
  try {
    const screenshots = await ProfitScreenshot.find().sort({ order: 1, createdAt: -1 });
    res.json({ screenshots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a screenshot
router.post('/screenshots', async (req, res) => {
  try {
    const { title, description, imageData, profit, trader, platform } = req.body;
    if (!title || !imageData) return res.status(400).json({ error: 'title and imageData are required' });
    const count = await ProfitScreenshot.countDocuments();
    const screenshot = await ProfitScreenshot.create({
      title, description, imageData, profit, trader,
      platform: platform || 'mt5',
      order: count,
    });
    res.json({ screenshot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a screenshot
router.put('/screenshots/:id', async (req, res) => {
  try {
    const screenshot = await ProfitScreenshot.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!screenshot) return res.status(404).json({ error: 'Screenshot not found' });
    res.json({ screenshot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a screenshot
router.delete('/screenshots/:id', async (req, res) => {
  try {
    await ProfitScreenshot.findByIdAndDelete(req.params.id);
    res.json({ message: 'Screenshot supprimé.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Search users (lightweight, for robot activation modal)
router.get('/robots/search-users', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ users: [] });
    const users = await User.find({
      $or: [
        { firstName: new RegExp(q, 'i') },
        { lastName: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') }
      ]
    })
      .select('firstName lastName email subscription isActive')
      .limit(10)
      .sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Bot Catalog Management (CRUD) ──────────────────────────────────────────

// List all bots (including inactive)
router.get('/bots/catalog', async (req, res) => {
  try {
    const bots = await Bot.find().sort({ order: 1, createdAt: -1 });
    res.json({ bots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new bot
router.post('/bots/catalog', async (req, res) => {
  try {
    const {
      name, tier, description, platforms, supportedContracts, supportedSymbols,
      defaultSettings, mt5Settings, features, price, billingCycle, commissionRate,
      minCapital, minTradeAmount, icon, color, badge, isPopular,
      robotFile, robotFileName, robotFileType, isUploaded
    } = req.body;

    if (!name || !tier) return res.status(400).json({ error: 'name and tier are required' });

    // Auto-generate slug
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = await Bot.findOne({ slug });
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

    const count = await Bot.countDocuments();
    const bot = await Bot.create({
      name, slug: finalSlug, tier, description,
      platforms: platforms || ['mt5'],
      supportedContracts: supportedContracts || [],
      supportedSymbols: supportedSymbols || [],
      defaultSettings: defaultSettings || {},
      mt5Settings: mt5Settings || {},
      features: features || [],
      price: price || 0,
      billingCycle: billingCycle || 'monthly',
      commissionRate: commissionRate || 0,
      minCapital: minCapital || 0,
      minTradeAmount: minTradeAmount || 0.35,
      icon: icon || 'Bot',
      color: color || '#8b5cf6',
      badge: badge || tier,
      isPopular: isPopular || false,
      order: count,
      robotFile: robotFile || '',
      robotFileName: robotFileName || '',
      robotFileType: robotFileType || '',
      isUploaded: isUploaded || false,
    });
    res.json({ bot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a bot
router.put('/bots/catalog/:id', async (req, res) => {
  try {
    // If name changed, regenerate slug
    if (req.body.name) {
      const slug = req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const existing = await Bot.findOne({ slug, _id: { $ne: req.params.id } });
      req.body.slug = existing ? `${slug}-${Date.now()}` : slug;
    }

    const bot = await Bot.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!bot) return res.status(404).json({ error: 'Bot not found' });
    res.json({ bot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a bot
router.delete('/bots/catalog/:id', async (req, res) => {
  try {
    const bot = await Bot.findById(req.params.id);
    if (!bot) return res.status(404).json({ error: 'Bot not found' });

    // Check if bot has active sessions
    const activeSessions = await BotSession.countDocuments({ bot: req.params.id, status: { $in: ['running', 'paused'] } });
    if (activeSessions > 0) {
      return res.status(400).json({ error: `Ce robot a ${activeSessions} session(s) active(s). Arrêtez-les d'abord.` });
    }

    await Bot.findByIdAndDelete(req.params.id);
    res.json({ message: 'Robot supprimé.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle bot active status
router.put('/bots/catalog/:id/toggle', async (req, res) => {
  try {
    const bot = await Bot.findById(req.params.id);
    if (!bot) return res.status(404).json({ error: 'Bot not found' });
    bot.isActive = !bot.isActive;
    await bot.save();
    res.json({ bot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ━━━ Platform Settings ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Get platform settings (admin)
router.get('/settings', async (req, res) => {
  try {
    let settings = await PlatformSettings.findOne({ key: 'main' });
    if (!settings) settings = await PlatformSettings.create({ key: 'main' });
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update platform settings
router.put('/settings', async (req, res) => {
  try {
    let settings = await PlatformSettings.findOne({ key: 'main' });
    if (!settings) settings = await PlatformSettings.create({ key: 'main' });

    const allowedFields = [
      'platformName', 'logoUrl', 'faviconUrl', 'tagline', 'description',
      'primaryColor', 'secondaryColor', 'gradientFrom', 'gradientTo',
      'heroTitle', 'heroHighlight', 'heroSubtitle', 'heroBadge',
      'stats',
      'footerText', 'copyrightName',
      'contactEmail', 'contactPhone',
      'whatsappLink', 'telegramLink', 'twitterLink', 'facebookLink',
      'instagramLink', 'youtubeLink',
      'brokerSignupUrl',
      'binanceReferralLink', 'binanceAffiliateCode',
      'bybitReferralLink', 'bybitAffiliateCode',
      'derivReferralLink', 'derivPartnerId', 'derivAppId', 'derivWsUrl', 'derivTrialDays',
      'usdtTronAddress', 'trongridApiKey',
      'binancePayId', 'binancePayMerchantId', 'binancePayApiKey', 'binancePaySecretKey', 'binancePayEmail',
      'sebpayBaseUrl', 'sebpayPublicKey', 'sebpaySecretKey',
      'metaTitle', 'metaDescription',
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        settings[field] = req.body[field];
      }
    });

    await settings.save();
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ━━━ Order Management (Robot Marketplace) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// List all orders
router.get('/orders', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.paymentStatus = status;

    const orders = await Order.find(query)
      .populate('user', 'firstName lastName email')
      .populate('items.bot', 'name slug')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Order.countDocuments(query);
    const pendingCount = await Order.countDocuments({ paymentStatus: 'pending' });

    res.json({ orders, pendingCount, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Confirm order payment — grant robots to user
router.put('/orders/:id/confirm', async (req, res) => {
  try {
    const { adminNotes } = req.body;
    const order = await Order.findById(req.params.id).populate('items.bot');
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' });

    if (order.paymentStatus === 'confirmed') {
      return res.status(400).json({ error: 'Commande déjà confirmée.' });
    }

    // Compute vendor revenues & platform commissions per item
    const vendorTotals = {};
    const vendorSalesCount = {};
    for (const item of order.items) {
      const bot = item.bot;
      if (bot && bot.vendor) {
        const rate = typeof bot.commissionRate === 'number' ? bot.commissionRate : 0;
        const platformCommission = rate > 0 ? (item.price * rate) / 100 : 0;
        const vendorRevenue = item.price - platformCommission;

        item.vendor = bot.vendor;
        item.vendorRevenue = vendorRevenue;
        item.platformCommission = platformCommission;

        const vId = bot.vendor.toString();
        vendorTotals[vId] = (vendorTotals[vId] || 0) + vendorRevenue;
        vendorSalesCount[vId] = (vendorSalesCount[vId] || 0) + 1;
      }
    }

    order.paymentStatus = 'confirmed';
    order.confirmedBy = req.user._id;
    order.confirmedAt = new Date();
    if (adminNotes) order.adminNotes = adminNotes;
    await order.save();

    // Grant robots to user
    const botIds = order.items.map(i => i.bot._id || i.bot);
    await User.findByIdAndUpdate(order.user, {
      $addToSet: { purchasedBots: { $each: botIds } }
    });

    // Increment totalUsers on each bot
    for (const botId of botIds) {
      await Bot.findByIdAndUpdate(botId, { $inc: { totalUsers: 1 } });
    }

    // Increment vendor earnings / available balances + VendorProfile stats
    const vendorIds = Object.keys(vendorTotals);
    for (const vendorId of vendorIds) {
      const amount = vendorTotals[vendorId];
      const sales = vendorSalesCount[vendorId] || 0;
      if (amount > 0) {
        await User.findByIdAndUpdate(vendorId, {
          $inc: { vendorEarnings: amount, vendorAvailable: amount }
        });
        await VendorProfile.findOneAndUpdate(
          { user: vendorId },
          { $inc: { totalSales: sales, totalRevenue: amount } }
        );
      }
    }

    res.json({ order, message: 'Commande confirmée. Robots attribués à l\'utilisateur.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject order
router.put('/orders/:id/reject', async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' });

    order.paymentStatus = 'rejected';
    order.rejectionReason = rejectionReason || 'Paiement non vérifié';
    order.confirmedBy = req.user._id;
    order.confirmedAt = new Date();
    await order.save();

    res.json({ order, message: 'Commande rejetée.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Order stats
router.get('/orders/stats', async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ paymentStatus: 'pending' });
    const confirmedOrders = await Order.countDocuments({ paymentStatus: 'confirmed' });
    const totalRevenue = await Order.aggregate([
      { $match: { paymentStatus: 'confirmed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    res.json({
      totalOrders,
      pendingOrders,
      confirmedOrders,
      totalRevenue: totalRevenue[0]?.total || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ━━━ Security Logs ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Get security logs
router.get('/security-logs', async (req, res) => {
  try {
    const { action, page = 1, limit = 50, blocked } = req.query;
    const query = {};
    if (action) query.action = action;
    if (blocked === 'true') query.blocked = true;

    const logs = await SecurityLog.find(query)
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await SecurityLog.countDocuments(query);
    const blockedCount = await SecurityLog.countDocuments({ blocked: true });

    res.json({ logs, blockedCount, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Unblock a user IP (admin override)
router.put('/users/:id/unblock-ip', async (req, res) => {
  try {
    const { newIp } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    if (newIp) {
      user.allowedIps = [newIp];
      user.lastLoginIp = newIp;
      user.registrationIp = newIp;
    }
    user.securityFlags = 0;
    user.ipLocked = false;
    await user.save();

    res.json({ user: user.toPublicJSON(), message: 'IP de l\'utilisateur réinitialisée.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
