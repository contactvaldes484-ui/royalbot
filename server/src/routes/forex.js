const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { enforceAIQuota } = require('../middleware/quota');
const ForexAIConfig = require('../models/ForexAIConfig');
const ForexAnalysis = require('../models/ForexAnalysis');
const ForexAlert    = require('../models/ForexAlert');
const analyzer      = require('../services/forexAnalyzer');
const scanner       = require('../services/forexScanner');

const VALID_STRATEGIES = new Set(analyzer.listStrategies().map(s => s.key));
function normStrategy(s) {
  return VALID_STRATEGIES.has(s) ? s : 'smc';
}

// ─── List available strategies (for UI selector) ─────────────────────────────
router.get('/strategies', authenticate, (req, res) => {
  res.json({ strategies: analyzer.listStrategies() });
});

// ─── Public-ish: analyse on-demand ───────────────────────────────────────────
// GET /api/forex/analyze?symbol=EURUSD&timeframe=1h&strategy=smc&fresh=1
router.get('/analyze', authenticate, enforceAIQuota, async (req, res) => {
  try {
    const { symbol, timeframe = '1h', fresh = '0' } = req.query;
    if (!symbol) return res.status(400).json({ error: 'symbol requis' });
    const strategy = normStrategy(req.query.strategy);

    const cfg = await ForexAIConfig.getSingleton();
    const sym = symbol.toUpperCase();

    if (fresh !== '1') {
      const cached = await ForexAnalysis.findOne({ symbol: sym, timeframe, strategy }).lean();
      if (cached && Date.now() - new Date(cached.computedAt).getTime() < cfg.cacheTtlMs) {
        return res.json({ analysis: cached, source: 'cache', quota: res.locals.aiQuota });
      }
    }

    const result = await analyzer.analyze(sym, timeframe, {
      swingLookback: cfg.swingLookback,
      candleCount: cfg.candleCount,
      dataProvider: cfg.dataProvider,
      apiKey: cfg.twelveDataApiKey,
      strategy,
    });
    if (!result) return res.status(503).json({ error: 'Données insuffisantes pour analyser' });

    const { bars, ...analysisCore } = result;
    await ForexAnalysis.findOneAndUpdate(
      { symbol: sym, timeframe, strategy },
      { ...analysisCore, computedAt: new Date() },
      { upsert: true, new: true },
    );

    // Return last 100 bars for chart drawing
    res.json({ analysis: analysisCore, bars: bars.slice(-100), source: 'fresh', quota: res.locals.aiQuota });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/forex/analyze-mtf?symbol=EURUSD&timeframes=15m,1h,4h,1d&strategy=smc
router.get('/analyze-mtf', authenticate, async (req, res) => {
  try {
    const { symbol, timeframes = '15m,1h,4h,1d' } = req.query;
    if (!symbol) return res.status(400).json({ error: 'symbol requis' });
    const strategy = normStrategy(req.query.strategy);
    const cfg = await ForexAIConfig.getSingleton();
    const tfs = timeframes.split(',').map(s => s.trim()).filter(Boolean);
    const results = await analyzer.analyzeMultiTF(symbol.toUpperCase(), tfs, {
      swingLookback: cfg.swingLookback,
      candleCount: cfg.candleCount,
      dataProvider: cfg.dataProvider,
      apiKey: cfg.twelveDataApiKey,
      strategy,
    });
    // Strip bars from response
    const cleaned = {};
    for (const [tf, r] of Object.entries(results)) {
      if (!r) { cleaned[tf] = null; continue; }
      const { bars, ...rest } = r;
      cleaned[tf] = rest;
    }
    res.json({ symbol: symbol.toUpperCase(), results: cleaned });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/forex/scanner — top setups from last scan
router.get('/scanner', authenticate, async (req, res) => {
  const { signal, minConfidence, limit = 30 } = req.query;
  let results = scanner.getLastResults();
  if (!results.length) {
    // Fallback: query DB
    results = await ForexAnalysis.find().sort({ confidence: -1, computedAt: -1 }).limit(100).lean();
  }
  if (signal && signal !== 'all') results = results.filter(r => r.signal === signal);
  if (minConfidence) results = results.filter(r => r.confidence >= Number(minConfidence));
  res.json({
    results: results.slice(0, Number(limit)),
    lastScanAt: scanner.lastCycleStart,
  });
});

// GET /api/forex/symbols — list of available symbols
router.get('/symbols', authenticate, async (req, res) => {
  const cfg = await ForexAIConfig.getSingleton();
  res.json({ symbols: cfg.symbols, timeframes: cfg.timeframes });
});

// ─── Alerts CRUD ─────────────────────────────────────────────────────────────
router.get('/alerts', authenticate, async (req, res) => {
  const alerts = await ForexAlert.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
  res.json({ alerts });
});

router.post('/alerts', authenticate, async (req, res) => {
  try {
    const alert = await ForexAlert.create({ ...req.body, user: req.user._id });
    res.json({ alert });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.patch('/alerts/:id', authenticate, async (req, res) => {
  const alert = await ForexAlert.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    req.body, { new: true });
  if (!alert) return res.status(404).json({ error: 'Alerte non trouvée' });
  res.json({ alert });
});

router.delete('/alerts/:id', authenticate, async (req, res) => {
  const r = await ForexAlert.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!r) return res.status(404).json({ error: 'Alerte non trouvée' });
  res.json({ success: true });
});

// ─── Admin ───────────────────────────────────────────────────────────────────
router.get('/admin/config', authenticate, requireAdmin, async (req, res) => {
  const cfg = await ForexAIConfig.getSingleton();
  // Hide twelveDataApiKey raw value
  const obj = cfg.toObject();
  if (obj.twelveDataApiKey) obj.twelveDataApiKey = '***' + obj.twelveDataApiKey.slice(-4);
  res.json({ config: obj });
});

router.patch('/admin/config', authenticate, requireAdmin, async (req, res) => {
  const cfg = await ForexAIConfig.getSingleton();
  const allowed = ['symbols', 'timeframes', 'scannerIntervalMs', 'cacheTtlMs', 'swingLookback',
    'candleCount', 'sensitivity', 'minConfidence', 'alertMinConfidence', 'enabled', 'alertsEnabled',
    'dataProvider', 'twelveDataApiKey'];
  for (const k of allowed) if (k in req.body) cfg[k] = req.body[k];
  await cfg.save();
  res.json({ success: true, config: cfg });
});

router.post('/admin/scan-now', authenticate, requireAdmin, async (req, res) => {
  scanner.scheduleNext(0);
  res.json({ success: true });
});

router.get('/admin/logs', authenticate, requireAdmin, async (req, res) => {
  res.json({ logs: scanner.getLogs(Number(req.query.limit) || 100) });
});

router.get('/admin/stats', authenticate, requireAdmin, async (req, res) => {
  const cfg = await ForexAIConfig.getSingleton();
  const [totalAnalyses, totalAlerts, totalAlertRules] = await Promise.all([
    ForexAnalysis.countDocuments(),
    ForexAlert.aggregate([{ $group: { _id: null, total: { $sum: '$triggered' } } }]).then(r => r[0]?.total || 0),
    ForexAlert.countDocuments({ enabled: true }),
  ]);
  res.json({
    enabled: cfg.enabled,
    lastScanAt: cfg.lastScanAt,
    lastScanDurationMs: cfg.lastScanDurationMs,
    totalScansRun: cfg.totalScansRun,
    totalAnalysesGenerated: cfg.totalAnalysesGenerated,
    totalAlertsFired: cfg.totalAlertsFired,
    activeAlertRules: totalAlertRules,
    totalAlertFirings: totalAlerts,
    cachedAnalyses: totalAnalyses,
  });
});

module.exports = router;
