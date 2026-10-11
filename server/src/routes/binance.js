const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getUserPlan } = require('../middleware/quota');
const { isAdmin } = require('../lib/permissions');
const BinanceAccount = require('../models/BinanceAccount');
const RobotSession = require('../models/RobotSession');
const BinanceTrade = require('../models/BinanceTrade');
const RobotLog = require('../models/RobotLog');
const BinanceService = require('../services/BinanceService');
const robotEngine = require('../services/RobotEngine');
const userStream = require('../services/BinanceUserDataStream');
const perf = require('../services/PerformanceService');
const execService = require('../services/TradeExecutionService');
const planCache = require('../services/planCache');
const cryptoCatalog = require('../services/CryptoRobotCatalogService');
const { ROBOT_CATALOG, ROBOT_MIN_PLAN } = require('../config/binanceRobots');

// ── Quota dédié Binance (mêmes limites de plan, comptage Binance) ──
async function enforceBinanceAccountQuota(req, res, next) {
  try {
    if (isAdmin(req.user.role)) return next();
    const plan = getUserPlan(req.user);
    const limit = plan.limits?.maxBinanceAccounts ?? plan.limits?.maxMT5Accounts ?? 0;
    if (limit === -1) return next();
    const count = await BinanceAccount.countDocuments({ user: req.user._id });
    if (count >= limit) return res.status(403).json({ error: `Limite atteinte (${count}/${limit} comptes). Passez à un plan supérieur.`, upgradeUrl: '/pricing' });
    next();
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function enforceBinanceRobotQuota(req, res, next) {
  try {
    if (isAdmin(req.user.role)) return next();
    const plan = getUserPlan(req.user);
    const limit = plan.limits?.maxRobots ?? 0;
    if (limit === -1) return next();
    const count = await RobotSession.countDocuments({ user: req.user._id, status: { $in: ['active', 'paused'] } });
    if (count >= limit) return res.status(403).json({ error: `Limite atteinte (${count}/${limit} robots actifs).`, upgradeUrl: '/pricing' });
    next();
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// ── Comptes Binance ────────────────────────────────────────────
router.get('/accounts', authenticate, async (req, res) => {
  try {
    const accounts = await BinanceAccount.find({ user: req.user._id });
    res.json({ accounts });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/accounts/connect', authenticate, enforceBinanceAccountQuota, async (req, res) => {
  try {
    const { apiKey, apiSecret, label, market = 'both', isTestnet = true } = req.body;
    if (!apiKey || !apiSecret) return res.status(400).json({ error: 'apiKey et apiSecret requis.' });

    const bx = new BinanceService({ apiKey, apiSecret, isTestnet });
    const test = await bx.testConnection(market);
    if (!test.reading) return res.status(400).json({ error: 'Clés invalides ou lecture refusée.', details: test.errors });
    if (test.withdraw) return res.status(400).json({ error: 'SÉCURITÉ : la permission de RETRAIT est activée. Désactive-la sur Binance puis recommence.' });

    const acc = new BinanceAccount({ user: req.user._id, label: label || 'Binance', market, isTestnet });
    acc.setKeys(apiKey, apiSecret);
    acc.permissions = { spot: test.spot, futures: test.futures, reading: test.reading, withdraw: false };
    acc.spotUSDT = test.spotUSDT || 0;
    acc.futuresUSDT = test.futuresUSDT || 0;
    acc.status = (test.spot || test.futures) ? 'active' : 'error';
    acc.lastCheck = new Date();
    acc.connectedAt = new Date();
    await acc.save();

    if (test.spot) userStream.start(acc._id, 'spot').catch(() => {});
    if (test.futures) userStream.start(acc._id, 'futures').catch(() => {});

    const safe = acc.toObject();
    delete safe.apiKeyEnc; delete safe.apiSecretEnc;
    res.json({ success: true, account: safe, test });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.post('/accounts/:id/test', authenticate, async (req, res) => {
  try {
    const acc = await BinanceAccount.findOne({ _id: req.params.id, user: req.user._id }).select('+apiKeyEnc +apiSecretEnc');
    if (!acc) return res.status(404).json({ error: 'Compte introuvable.' });
    const { apiKey, apiSecret } = acc.getKeys();
    const test = await new BinanceService({ apiKey, apiSecret, isTestnet: acc.isTestnet }).testConnection(acc.market);
    acc.status = (test.spot || test.futures) ? 'active' : 'error';
    acc.lastCheck = new Date();
    acc.spotUSDT = test.spotUSDT || acc.spotUSDT;
    acc.futuresUSDT = test.futuresUSDT || acc.futuresUSDT;
    await acc.save();
    res.json({ test, status: acc.status });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/accounts/:id', authenticate, async (req, res) => {
  try {
    const acc = await BinanceAccount.findOne({ _id: req.params.id, user: req.user._id });
    if (!acc) return res.status(404).json({ error: 'Compte introuvable.' });
    const sessions = await RobotSession.find({ binanceAccount: acc._id, status: { $in: ['active', 'paused'] } });
    for (const s of sessions) await robotEngine.stopSession(s._id, req.user._id);
    userStream.stop(acc._id, 'spot');
    userStream.stop(acc._id, 'futures');
    await BinanceAccount.findByIdAndDelete(acc._id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Catalogue robots ───────────────────────────────────────────
router.get('/robots', authenticate, async (req, res) => {
  try {
    const robots = await cryptoCatalog.getRobots();
    res.json({ robots });
  } catch (err) {
    res.json({ robots: ROBOT_CATALOG });
  }
});

// ── Sessions ───────────────────────────────────────────────────
router.post('/sessions/start', authenticate, enforceBinanceRobotQuota, async (req, res) => {
  try {
    const { accountId, robotKey, market, settings, risk } = req.body;
    if (!accountId || !robotKey || !market) return res.status(400).json({ error: 'accountId, robotKey, market requis.' });

    const userPlan = req.user.subscription?.plan || 'free';
    const required = ROBOT_MIN_PLAN[robotKey] || 'free';
    if (!planCache.planMeetsTier(userPlan, required))
      return res.status(403).json({ error: `Robot réservé au plan ${required.toUpperCase()}+.`, requiredPlan: required });

    const exists = await RobotSession.findOne({
      user: req.user._id,
      $or: [{ binanceAccount: accountId }, { bybitAccount: accountId }],
      robotKey,
      status: 'active'
    });
    if (exists) return res.status(400).json({ error: 'Ce robot tourne déjà sur ce compte.' });

    const session = await robotEngine.startSession(req.user._id, accountId, robotKey, market, { ...settings, risk });
    res.json({ success: true, session });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/sessions/:id/stop', authenticate, async (req, res) => {
  try { res.json({ session: await robotEngine.stopSession(req.params.id, req.user._id) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/sessions/:id/pause', authenticate, async (req, res) => {
  try { res.json({ session: await robotEngine.pauseSession(req.params.id, req.user._id) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/sessions/:id/resume', authenticate, async (req, res) => {
  try { res.json({ session: await robotEngine.resumeSession(req.params.id, req.user._id) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/sessions', authenticate, async (req, res) => {
  try {
    const sessions = await RobotSession.find({ user: req.user._id, status: { $in: ['active', 'paused'] } })
      .populate('binanceAccount', 'label market isTestnet')
      .populate('bybitAccount', 'label isTestnet');
    res.json({ sessions });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/sessions/:id/trades', authenticate, async (req, res) => {
  try {
    const session = await RobotSession.findOne({ _id: req.params.id, user: req.user._id });
    if (!session) return res.status(404).json({ error: 'Session introuvable.' });
    const trades = await BinanceTrade.find({ session: session._id }).sort({ openedAt: -1 }).limit(200);
    res.json({ trades, stats: session.stats });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/sessions/:id/logs', authenticate, async (req, res) => {
  try {
    const logs = await RobotLog.find({ session: req.params.id, user: req.user._id }).sort({ createdAt: -1 }).limit(100);
    res.json({ logs });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Trades + perf user ─────────────────────────────────────────
router.get('/trades', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 30 } = req.query;
    const q = { user: req.user._id };
    if (status) q.status = status;
    const trades = await BinanceTrade.find(q).sort({ openedAt: -1 }).skip((page - 1) * limit).limit(Number(limit));
    res.json({ trades });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/trades/:id/close', authenticate, async (req, res) => {
  try {
    const trade = await BinanceTrade.findOne({ _id: req.params.id, user: req.user._id });
    if (!trade) return res.status(404).json({ error: 'Trade introuvable.' });
    res.json({ trade: await execService.closeTrade(trade._id, 'manual') });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats', authenticate, async (req, res) => {
  try { res.json({ stats: await perf.userSummary(req.user._id) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Admin ──────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  if (!isAdmin(req.user.role)) return res.status(403).json({ error: 'Accès admin requis.' });
  next();
}

// Dashboard global (KPIs)
router.get('/admin/dashboard', authenticate, requireAdmin, async (req, res) => {
  try { res.json({ stats: await perf.adminDashboard() }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Perf par robot
router.get('/admin/robots', authenticate, requireAdmin, async (req, res) => {
  try { res.json({ robots: await perf.robotLeaderboard() }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Tous les comptes Binance connectés (jamais les clés)
router.get('/admin/accounts', authenticate, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const accounts = await BinanceAccount.find({})
      .populate('user', 'firstName lastName email role isActive')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(Number(limit));
    const total = await BinanceAccount.countDocuments({});
    res.json({ accounts, total, page: Number(page) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Tous les trades (filtrable)
router.get('/admin/trades', authenticate, requireAdmin, async (req, res) => {
  try {
    const { status, market, robotKey, page = 1, limit = 50 } = req.query;
    const q = {};
    if (status) q.status = status;
    if (market) q.market = market;
    if (robotKey) q.robotKey = robotKey;
    const trades = await BinanceTrade.find(q)
      .populate('user', 'firstName lastName email')
      .sort({ openedAt: -1 })
      .skip((page - 1) * limit).limit(Number(limit));
    const total = await BinanceTrade.countDocuments(q);
    res.json({ trades, total, page: Number(page) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Journal d'erreurs / événements robots (tous users)
router.get('/admin/logs', authenticate, requireAdmin, async (req, res) => {
  try {
    const { level, limit = 100 } = req.query;
    const q = {};
    if (level) q.level = level;
    const logs = await RobotLog.find(q)
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 }).limit(Number(limit));
    res.json({ logs });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
