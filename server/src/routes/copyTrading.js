const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const MasterAccount = require('../models/MasterAccount');
const CopySubscription = require('../models/CopySubscription');
const CopyTrade = require('../models/CopyTrade');
const CommissionLedger = require('../models/CommissionLedger');
const BinanceAccount = require('../models/BinanceAccount');
const RobotSession = require('../models/RobotSession');
const BinanceTrade = require('../models/BinanceTrade');
const User = require('../models/User');
const copyEngine = require('../services/copyTradingEngine');
const aiGuard = require('../services/copyTradingAI');

const slugify = (s) => String(s || '').toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

// ═════════════════════════════════════════════════════════════════════════════
// PUBLIC — leaderboard & profiles (no auth required)
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/copy-trading/masters — leaderboard
router.get('/masters', async (req, res) => {
  try {
    const { sort = 'roi', tradingStyle, riskLevel, search, page = 1, limit = 24 } = req.query;
    const filter = { status: 'approved', isVisible: true };
    if (tradingStyle) filter.tradingStyle = tradingStyle;
    if (riskLevel) filter.riskLevel = riskLevel;
    if (search) filter.$or = [
      { displayName: new RegExp(search, 'i') },
      { slug: new RegExp(search, 'i') },
    ];

    const sortMap = {
      roi: { 'stats.roi': -1 },
      winrate: { 'stats.winRate': -1 },
      followers: { followersCount: -1 },
      profit: { 'stats.totalProfit': -1 },
      drawdown: { 'stats.maxDrawdown': 1 },
      recent: { createdAt: -1 },
    };
    const sortQuery = sortMap[sort] || sortMap.roi;

    const skip = (Number(page) - 1) * Number(limit);
    const [masters, total] = await Promise.all([
      MasterAccount.find(filter)
        .select('-equityCurve')
        .sort(sortQuery)
        .skip(skip).limit(Number(limit))
        .lean(),
      MasterAccount.countDocuments(filter),
    ]);

    res.json({
      masters,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/copy-trading/masters/:slug — master profile (full)
router.get('/masters/:slug', async (req, res) => {
  try {
    const master = await MasterAccount.findOne({ slug: req.params.slug, status: 'approved' })
      .populate('user', 'firstName lastName avatar')
      .lean();
    if (!master) return res.status(404).json({ error: 'Master non trouvé' });
    res.json({ master });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/copy-trading/masters/:slug/trades — recent trades history
router.get('/masters/:slug/trades', async (req, res) => {
  try {
    const master = await MasterAccount.findOne({ slug: req.params.slug, status: 'approved' });
    if (!master) return res.status(404).json({ error: 'Master non trouvé' });

    let trades = [];
    if (master.robotSession) {
      const recent = await BinanceTrade.find({ session: master.robotSession })
        .sort({ openedAt: -1 }).limit(50).lean();
      trades = recent.map(t => ({
        ticket: t.binanceOrderId || String(t._id), symbol: t.symbol, market: t.market,
        type: t.side === 'BUY' ? 'buy' : 'sell',
        volume: t.qty, openPrice: t.entryPrice, closePrice: t.exitPrice,
        profit: t.pnl, openTime: t.openedAt, closeTime: t.closedAt, status: t.status,
      }));
    }
    res.json({ trades });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═════════════════════════════════════════════════════════════════════════════
// USER — apply to become a master
// ═════════════════════════════════════════════════════════════════════════════

// POST /api/copy-trading/apply — apply to become a master
router.post('/apply', authenticate, async (req, res) => {
  try {
    const { displayName, bio, country, tradingStyle, riskLevel, robotSessionId, feePct, minCapital } = req.body;
    if (!displayName) return res.status(400).json({ error: 'displayName requis' });
    if (!robotSessionId) return res.status(400).json({ error: 'robotSessionId requis (session robot Binance master)' });

    // Validate source ownership (session robot Binance de l'user)
    const sess = await RobotSession.findOne({ _id: robotSessionId, user: req.user._id });
    if (!sess) return res.status(404).json({ error: 'Session robot non trouvée' });

    // Generate unique slug
    let baseSlug = slugify(displayName);
    if (!baseSlug) baseSlug = `trader-${Date.now()}`;
    let slug = baseSlug;
    let i = 1;
    while (await MasterAccount.exists({ slug })) { slug = `${baseSlug}-${i++}`; }

    const master = await MasterAccount.create({
      user: req.user._id,
      slug,
      displayName: displayName.trim(),
      bio: (bio || '').trim(),
      country: (country || '').trim(),
      tradingStyle: tradingStyle || 'mixed',
      riskLevel: riskLevel || 'medium',
      sourceType: 'bot',
      robotSession: sess._id,
      binanceAccount: sess.binanceAccount,
      robotKey: sess.robotKey,
      market: sess.market,
      feePct: Math.max(0, Math.min(50, Number(feePct) || 0)),
      minCapital: Math.max(0, Number(minCapital) || 100),
      status: 'pending',
      stats: { startBalance: sess.stats?.startEquity || 1000 },
    });

    res.json({ success: true, master });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Ce nom est déjà utilisé' });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/copy-trading/my-masters — masters owned by current user
router.get('/my-masters', authenticate, async (req, res) => {
  const masters = await MasterAccount.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
  res.json({ masters });
});

// ═════════════════════════════════════════════════════════════════════════════
// USER — follow / unfollow / settings
// ═════════════════════════════════════════════════════════════════════════════

// POST /api/copy-trading/follow/:masterId
router.post('/follow/:masterId', authenticate, async (req, res) => {
  try {
    const { binanceAccountId, settings = {} } = req.body;
    if (!binanceAccountId) return res.status(400).json({ error: 'binanceAccountId requis' });

    const master = await MasterAccount.findOne({ _id: req.params.masterId, status: 'approved' });
    if (!master) return res.status(404).json({ error: 'Master non disponible' });

    if (master.user.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Vous ne pouvez pas vous copier vous-même' });
    }

    const account = await BinanceAccount.findOne({ _id: binanceAccountId, user: req.user._id });
    if (!account) return res.status(404).json({ error: 'Compte Binance non trouvé' });

    if (master.maxFollowers > 0 && master.followersCount >= master.maxFollowers) {
      return res.status(400).json({ error: 'Ce master a atteint son nombre maximum de copieurs' });
    }

    const existing = await CopySubscription.findOne({
      follower: req.user._id, master: master._id, followerBinanceAccount: account._id, status: { $ne: 'stopped' },
    });
    if (existing) return res.status(400).json({ error: 'Vous suivez déjà ce master sur ce compte' });

    const sub = await CopySubscription.create({
      follower: req.user._id, master: master._id, followerBinanceAccount: account._id,
      status: 'active',
      settings: {
        lotMode:        settings.lotMode || 'proportional',
        fixedLot:       Math.max(0, Number(settings.fixedLot) || 0.01),
        multiplier:     Math.max(0.01, Math.min(10, Number(settings.multiplier) || 1.0)),
        maxLotPerTrade: Math.max(0, Number(settings.maxLotPerTrade) || 0),
        copySL:         settings.copySL !== false,
        copyTP:         settings.copyTP !== false,
        reverseDirection: !!settings.reverseDirection,
        allowedSymbols: Array.isArray(settings.allowedSymbols) ? settings.allowedSymbols : [],
        maxAllocation:  Number(settings.maxAllocation) || 1000,
        maxRiskPct:     Math.max(0, Math.min(100, Number(settings.maxRiskPct) || 5)),
        maxDrawdownPct: Math.max(0, Math.min(100, Number(settings.maxDrawdownPct) || 20)),
        globalSL:       Number(settings.globalSL) || 0,
        globalTP:       Number(settings.globalTP) || 0,
        aiGuardEnabled: settings.aiGuardEnabled !== false,
        aiPauseOnMasterDanger: settings.aiPauseOnMasterDanger !== false,
      },
      stats: { startEquity: (account.futuresUSDT || 0) + (account.spotUSDT || 0) || 1000 },
    });

    master.followersCount = (master.followersCount || 0) + 1;
    await master.save();

    res.json({ success: true, subscription: sub });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Souscription déjà existante' });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/copy-trading/my-subscriptions
router.get('/my-subscriptions', authenticate, async (req, res) => {
  const subs = await CopySubscription.find({ follower: req.user._id, status: { $ne: 'stopped' } })
    .populate('master', 'slug displayName avatar tradingStyle riskLevel stats aiRisk badges')
    .populate('followerBinanceAccount', 'label market isTestnet status spotUSDT futuresUSDT')
    .sort({ createdAt: -1 }).lean();
  res.json({ subscriptions: subs });
});

// PATCH /api/copy-trading/subscriptions/:id — update settings
router.patch('/subscriptions/:id', authenticate, async (req, res) => {
  try {
    const sub = await CopySubscription.findOne({ _id: req.params.id, follower: req.user._id });
    if (!sub) return res.status(404).json({ error: 'Souscription non trouvée' });

    const s = req.body.settings || {};
    Object.assign(sub.settings, {
      ...(s.lotMode && { lotMode: s.lotMode }),
      ...(s.fixedLot !== undefined && { fixedLot: Math.max(0.01, Math.min(100, Number(s.fixedLot))) }),
      ...(s.multiplier !== undefined && { multiplier: Math.max(0.01, Math.min(10, Number(s.multiplier))) }),
      ...(s.maxLotPerTrade !== undefined && { maxLotPerTrade: Math.max(0, Number(s.maxLotPerTrade)) }),
      ...(s.copySL !== undefined && { copySL: !!s.copySL }),
      ...(s.copyTP !== undefined && { copyTP: !!s.copyTP }),
      ...(s.reverseDirection !== undefined && { reverseDirection: !!s.reverseDirection }),
      ...(Array.isArray(s.allowedSymbols) && { allowedSymbols: s.allowedSymbols }),
      ...(s.maxAllocation !== undefined && { maxAllocation: Number(s.maxAllocation) }),
      ...(s.maxRiskPct !== undefined && { maxRiskPct: Number(s.maxRiskPct) }),
      ...(s.maxDrawdownPct !== undefined && { maxDrawdownPct: Number(s.maxDrawdownPct) }),
      ...(s.globalSL !== undefined && { globalSL: Number(s.globalSL) }),
      ...(s.globalTP !== undefined && { globalTP: Number(s.globalTP) }),
      ...(s.aiGuardEnabled !== undefined && { aiGuardEnabled: !!s.aiGuardEnabled }),
      ...(s.aiPauseOnMasterDanger !== undefined && { aiPauseOnMasterDanger: !!s.aiPauseOnMasterDanger }),
    });
    await sub.save();
    res.json({ success: true, subscription: sub });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/copy-trading/subscriptions/:id/pause
router.post('/subscriptions/:id/pause', authenticate, async (req, res) => {
  const sub = await CopySubscription.findOne({ _id: req.params.id, follower: req.user._id });
  if (!sub) return res.status(404).json({ error: 'Souscription non trouvée' });
  if (sub.status === 'stopped') return res.status(400).json({ error: 'Souscription arrêtée' });
  sub.status = 'paused'; sub.pausedBy = 'user'; sub.pauseReason = 'manual'; sub.pausedAt = new Date();
  await sub.save();
  res.json({ success: true, subscription: sub });
});

// POST /api/copy-trading/subscriptions/:id/resume
router.post('/subscriptions/:id/resume', authenticate, async (req, res) => {
  const sub = await CopySubscription.findOne({ _id: req.params.id, follower: req.user._id });
  if (!sub) return res.status(404).json({ error: 'Souscription non trouvée' });
  if (sub.status === 'stopped') return res.status(400).json({ error: 'Souscription arrêtée — recréez-la' });
  sub.status = 'active'; sub.pausedBy = null; sub.pauseReason = ''; sub.pausedAt = null;
  await sub.save();
  res.json({ success: true, subscription: sub });
});

// DELETE /api/copy-trading/subscriptions/:id — stop copy permanently
router.delete('/subscriptions/:id', authenticate, async (req, res) => {
  const sub = await CopySubscription.findOne({ _id: req.params.id, follower: req.user._id });
  if (!sub) return res.status(404).json({ error: 'Souscription non trouvée' });
  sub.status = 'stopped'; sub.stoppedAt = new Date();
  await sub.save();
  await MasterAccount.findByIdAndUpdate(sub.master, { $inc: { followersCount: -1 } });
  res.json({ success: true });
});

// GET /api/copy-trading/subscriptions/:id/trades — copy trades history for a subscription
router.get('/subscriptions/:id/trades', authenticate, async (req, res) => {
  const sub = await CopySubscription.findOne({ _id: req.params.id, follower: req.user._id });
  if (!sub) return res.status(404).json({ error: 'Souscription non trouvée' });
  const { page = 1, limit = 30 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const [trades, total] = await Promise.all([
    CopyTrade.find({ subscription: sub._id }).sort({ openTime: -1 }).skip(skip).limit(Number(limit)).lean(),
    CopyTrade.countDocuments({ subscription: sub._id }),
  ]);
  res.json({ trades, pagination: { page: Number(page), pages: Math.ceil(total / limit), total } });
});

// GET /api/copy-trading/my-stats — aggregated follower stats
router.get('/my-stats', authenticate, async (req, res) => {
  const subs = await CopySubscription.find({ follower: req.user._id });
  const totals = subs.reduce((a, s) => ({
    copied: a.copied + (s.stats.copiedTrades || 0),
    open: a.open + (s.stats.openTrades || 0),
    wins: a.wins + (s.stats.wins || 0),
    losses: a.losses + (s.stats.losses || 0),
    profit: a.profit + (s.stats.totalProfit || 0),
    loss: a.loss + (s.stats.totalLoss || 0),
    fees: a.fees + (s.stats.feesPaid || 0),
  }), { copied: 0, open: 0, wins: 0, losses: 0, profit: 0, loss: 0, fees: 0 });
  const totalTrades = totals.wins + totals.losses;
  res.json({
    stats: {
      activeSubscriptions: subs.filter(s => s.status === 'active').length,
      pausedSubscriptions: subs.filter(s => s.status === 'paused').length,
      ...totals,
      netPnl: +(totals.profit - totals.loss).toFixed(2),
      winRate: totalTrades > 0 ? +((totals.wins / totalTrades) * 100).toFixed(1) : 0,
    },
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// MASTER COMMISSIONS / PAYOUTS
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/copy-trading/master/earnings — earnings dashboard for masters
router.get('/master/earnings', authenticate, async (req, res) => {
  const user = await User.findById(req.user._id).select('copyTradingEarnings copyTradingAvailable copyTradingPaidOut').lean();

  // 30-day earnings history
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);
  const recentEarn = await CommissionLedger.aggregate([
    { $match: { master: req.user._id, type: 'earn', createdAt: { $gte: thirtyDaysAgo } } },
    { $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      total: { $sum: '$amount' },
      count: { $sum: 1 },
    } },
    { $sort: { _id: 1 } },
  ]);

  // Aggregate by master account
  const byMaster = await CommissionLedger.aggregate([
    { $match: { master: req.user._id, type: 'earn' } },
    { $group: { _id: '$masterAccount', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $lookup: { from: 'masteraccounts', localField: '_id', foreignField: '_id', as: 'master' } },
    { $unwind: { path: '$master', preserveNullAndEmptyArrays: true } },
    { $project: { _id: 1, total: 1, count: 1, displayName: '$master.displayName', slug: '$master.slug', followersCount: '$master.followersCount' } },
    { $sort: { total: -1 } },
  ]);

  res.json({
    earnings: {
      total: user?.copyTradingEarnings || 0,
      available: user?.copyTradingAvailable || 0,
      paidOut: user?.copyTradingPaidOut || 0,
    },
    timeline: recentEarn,
    byMaster,
  });
});

// GET /api/copy-trading/master/ledger — paginated history of commission events
router.get('/master/ledger', authenticate, async (req, res) => {
  const { page = 1, limit = 50, type } = req.query;
  const filter = { master: req.user._id };
  if (type && ['earn', 'payout', 'adjust'].includes(type)) filter.type = type;
  const skip = (Number(page) - 1) * Number(limit);
  const [entries, total] = await Promise.all([
    CommissionLedger.find(filter)
      .populate('masterAccount', 'displayName slug')
      .populate('follower', 'firstName lastName email')
      .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    CommissionLedger.countDocuments(filter),
  ]);
  res.json({ entries, pagination: { page: Number(page), pages: Math.ceil(total / limit), total } });
});

// POST /api/copy-trading/master/payout-request
// Master demande un paiement de ses commissions. Traité manuellement par l'équipe
// (crypto/virement/PayPal). La plateforme ne contrôle PAS les retraits broker.
router.post('/master/payout-request', authenticate, async (req, res) => {
  try {
    const { amount, method, address, notes = '' } = req.body;
    const amt = Number(amount);
    if (!amt || amt <= 0) return res.status(400).json({ error: 'Montant invalide' });
    if (!['crypto', 'bank_transfer', 'paypal', 'other'].includes(method)) {
      return res.status(400).json({ error: 'Méthode de paiement invalide' });
    }
    if (!address || !address.trim()) {
      return res.status(400).json({ error: 'Adresse de paiement requise (wallet, IBAN, email...)' });
    }
    // Prevent duplicate pending requests
    const existingPending = await CommissionLedger.findOne({
      master: req.user._id, type: 'payout', payoutStatus: { $in: ['pending', 'processing'] },
    });
    if (existingPending) {
      return res.status(400).json({ error: 'Vous avez déjà une demande en cours de traitement' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    if ((user.copyTradingAvailable || 0) < amt) {
      return res.status(400).json({ error: `Solde insuffisant. Disponible : $${(user.copyTradingAvailable || 0).toFixed(2)}` });
    }

    // Decrement available — funds are "locked" until admin completes/rejects
    user.copyTradingAvailable = +(user.copyTradingAvailable - amt).toFixed(2);
    await user.save();

    const entry = await CommissionLedger.create({
      master: req.user._id,
      type: 'payout',
      amount: -amt,
      payoutMethod: method,
      payoutStatus: 'pending',
      payoutAddress: address.trim(),
      payoutNotes: notes,
      description: `Demande de paiement master · ${method} · $${amt.toFixed(2)}`,
    });

    res.json({ success: true, entry, available: user.copyTradingAvailable });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/copy-trading/master/payout/:id — annuler sa propre demande pending
router.delete('/master/payout/:id', authenticate, async (req, res) => {
  const entry = await CommissionLedger.findOne({
    _id: req.params.id, master: req.user._id, type: 'payout', payoutStatus: 'pending',
  });
  if (!entry) return res.status(404).json({ error: 'Demande introuvable ou déjà traitée' });

  // Refund the amount to available balance
  await User.findByIdAndUpdate(req.user._id, { $inc: { copyTradingAvailable: Math.abs(entry.amount) } });
  entry.payoutStatus = 'rejected';
  entry.payoutNotes = (entry.payoutNotes || '') + ' [Annulé par le master]';
  await entry.save();
  res.json({ success: true });
});

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/copy-trading/admin/masters
router.get('/admin/masters', authenticate, requireAdmin, async (req, res) => {
  const { status, page = 1, limit = 30 } = req.query;
  const filter = {};
  if (status && status !== 'all') filter.status = status;
  const skip = (Number(page) - 1) * Number(limit);
  const [masters, total, pendingCount] = await Promise.all([
    MasterAccount.find(filter).populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    MasterAccount.countDocuments(filter),
    MasterAccount.countDocuments({ status: 'pending' }),
  ]);
  res.json({ masters, pagination: { page: Number(page), pages: Math.ceil(total / limit), total }, pendingCount });
});

// POST /api/copy-trading/admin/masters/:id/approve
router.post('/admin/masters/:id/approve', authenticate, requireAdmin, async (req, res) => {
  const { badges } = req.body;
  const master = await MasterAccount.findByIdAndUpdate(req.params.id,
    {
      status: 'approved',
      reviewedBy: req.user._id, reviewedAt: new Date(),
      ...(Array.isArray(badges) && { badges }),
    },
    { new: true });
  if (!master) return res.status(404).json({ error: 'Master non trouvé' });
  res.json({ success: true, master });
});

// POST /api/copy-trading/admin/masters/:id/reject
router.post('/admin/masters/:id/reject', authenticate, requireAdmin, async (req, res) => {
  const { reason } = req.body;
  const master = await MasterAccount.findByIdAndUpdate(req.params.id,
    { status: 'rejected', rejectionReason: reason || '', reviewedBy: req.user._id, reviewedAt: new Date() },
    { new: true });
  if (!master) return res.status(404).json({ error: 'Master non trouvé' });
  res.json({ success: true, master });
});

// POST /api/copy-trading/admin/masters/:id/suspend
router.post('/admin/masters/:id/suspend', authenticate, requireAdmin, async (req, res) => {
  const { reason } = req.body;
  const master = await MasterAccount.findByIdAndUpdate(req.params.id,
    { status: 'suspended', rejectionReason: reason || '', reviewedBy: req.user._id, reviewedAt: new Date() },
    { new: true });
  if (!master) return res.status(404).json({ error: 'Master non trouvé' });

  // Auto-pause all active subscriptions
  await CopySubscription.updateMany(
    { master: master._id, status: 'active' },
    { status: 'paused', pausedBy: 'admin', pauseReason: 'Master suspendu', pausedAt: new Date() }
  );
  res.json({ success: true, master });
});

// POST /api/copy-trading/admin/masters/:id/unsuspend
router.post('/admin/masters/:id/unsuspend', authenticate, requireAdmin, async (req, res) => {
  const master = await MasterAccount.findByIdAndUpdate(req.params.id,
    { status: 'approved', rejectionReason: '' }, { new: true });
  if (!master) return res.status(404).json({ error: 'Master non trouvé' });
  res.json({ success: true, master });
});

// DELETE /api/copy-trading/admin/masters/:id
router.delete('/admin/masters/:id', authenticate, requireAdmin, async (req, res) => {
  await MasterAccount.findByIdAndDelete(req.params.id);
  await CopySubscription.updateMany({ master: req.params.id }, { status: 'stopped', stoppedAt: new Date() });
  res.json({ success: true });
});

// GET /api/copy-trading/admin/logs — engine logs (real-time monitoring)
router.get('/admin/logs', authenticate, requireAdmin, (req, res) => {
  res.json({ logs: copyEngine.getLogs(Number(req.query.limit) || 100) });
});

// GET /api/copy-trading/admin/stats — global copy trading stats
router.get('/admin/stats', authenticate, requireAdmin, async (req, res) => {
  const [totalMasters, approvedMasters, pendingMasters, suspendedMasters, totalSubs, activeSubs, totalCopyTrades] = await Promise.all([
    MasterAccount.countDocuments({}),
    MasterAccount.countDocuments({ status: 'approved' }),
    MasterAccount.countDocuments({ status: 'pending' }),
    MasterAccount.countDocuments({ status: 'suspended' }),
    CopySubscription.countDocuments({}),
    CopySubscription.countDocuments({ status: 'active' }),
    CopyTrade.countDocuments({}),
  ]);

  // Sum commissions paid to platform (sum of CopyTrade.fee)
  const feeAgg = await CopyTrade.aggregate([
    { $match: { status: 'closed', fee: { $gt: 0 } } },
    { $group: { _id: null, totalFees: { $sum: '$fee' }, count: { $sum: 1 } } },
  ]);

  res.json({
    stats: {
      totalMasters, approvedMasters, pendingMasters, suspendedMasters,
      totalSubs, activeSubs, totalCopyTrades,
      totalCommissions: feeAgg[0]?.totalFees || 0,
      profitableCopies: feeAgg[0]?.count || 0,
    },
  });
});

// POST /api/copy-trading/admin/masters/:id/recheck — re-run AI risk check
router.post('/admin/masters/:id/recheck', authenticate, requireAdmin, async (req, res) => {
  const risk = await aiGuard.evaluateAndProtect(req.params.id);
  res.json({ success: true, aiRisk: risk });
});

// ─── Admin payout management ─────────────────────────────────────────────────
// GET /api/copy-trading/admin/payouts — list payout requests
router.get('/admin/payouts', authenticate, requireAdmin, async (req, res) => {
  const { status = 'pending', page = 1, limit = 30 } = req.query;
  const filter = { type: 'payout' };
  if (status && status !== 'all') filter.payoutStatus = status;
  const skip = (Number(page) - 1) * Number(limit);
  const [payouts, total, pendingTotal] = await Promise.all([
    CommissionLedger.find(filter)
      .populate('master', 'firstName lastName email copyTradingAvailable copyTradingPaidOut copyTradingEarnings')
      .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    CommissionLedger.countDocuments(filter),
    CommissionLedger.aggregate([
      { $match: { type: 'payout', payoutStatus: 'pending' } },
      { $group: { _id: null, total: { $sum: { $abs: '$amount' } }, count: { $sum: 1 } } },
    ]),
  ]);
  res.json({
    payouts,
    pagination: { page: Number(page), pages: Math.ceil(total / limit), total },
    pendingSummary: { amount: pendingTotal[0]?.total || 0, count: pendingTotal[0]?.count || 0 },
  });
});

// POST /api/copy-trading/admin/payouts/:id/process — mark as processing
router.post('/admin/payouts/:id/process', authenticate, requireAdmin, async (req, res) => {
  const entry = await CommissionLedger.findOneAndUpdate(
    { _id: req.params.id, type: 'payout', payoutStatus: 'pending' },
    { payoutStatus: 'processing', processedBy: req.user._id },
    { new: true });
  if (!entry) return res.status(404).json({ error: 'Demande introuvable ou déjà traitée' });
  res.json({ success: true, entry });
});

// POST /api/copy-trading/admin/payouts/:id/complete — mark as paid (with tx ref)
router.post('/admin/payouts/:id/complete', authenticate, requireAdmin, async (req, res) => {
  try {
    const { txRef = '', notes = '' } = req.body;
    const entry = await CommissionLedger.findOne({ _id: req.params.id, type: 'payout' });
    if (!entry) return res.status(404).json({ error: 'Demande introuvable' });
    if (!['pending', 'processing'].includes(entry.payoutStatus)) {
      return res.status(400).json({ error: 'Demande déjà traitée' });
    }

    entry.payoutStatus = 'completed';
    entry.payoutTxRef = txRef;
    if (notes) entry.payoutNotes = (entry.payoutNotes || '') + ' | ADMIN: ' + notes;
    entry.processedBy = req.user._id;
    await entry.save();

    // Move from "available" → "paidOut" (available was already decremented at request time)
    await User.findByIdAndUpdate(entry.master, {
      $inc: { copyTradingPaidOut: Math.abs(entry.amount) },
    });

    if (global.broadcastToUser) global.broadcastToUser(entry.master.toString(), {
      type: 'copy_payout_completed', amount: Math.abs(entry.amount), method: entry.payoutMethod, txRef,
    });

    res.json({ success: true, entry });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/copy-trading/admin/payouts/:id/reject — refund and mark rejected
router.post('/admin/payouts/:id/reject', authenticate, requireAdmin, async (req, res) => {
  try {
    const { reason = '' } = req.body;
    const entry = await CommissionLedger.findOne({ _id: req.params.id, type: 'payout' });
    if (!entry) return res.status(404).json({ error: 'Demande introuvable' });
    if (!['pending', 'processing'].includes(entry.payoutStatus)) {
      return res.status(400).json({ error: 'Demande déjà traitée' });
    }

    entry.payoutStatus = 'rejected';
    entry.payoutNotes = (entry.payoutNotes || '') + ' | REJET ADMIN: ' + (reason || 'aucun motif');
    entry.processedBy = req.user._id;
    await entry.save();

    // Refund
    await User.findByIdAndUpdate(entry.master, { $inc: { copyTradingAvailable: Math.abs(entry.amount) } });

    if (global.broadcastToUser) global.broadcastToUser(entry.master.toString(), {
      type: 'copy_payout_rejected', amount: Math.abs(entry.amount), reason,
    });

    res.json({ success: true, entry });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
