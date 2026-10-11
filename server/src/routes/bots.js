const express = require('express');
const Bot = require('../models/Bot');
const BotSession = require('../models/BotSession');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ─── BROWSE / READ ROUTES (kept) ────────────────────────────────────────

// List all active bots
router.get('/', async (req, res) => {
  try {
    const bots = await Bot.find({ isActive: true });
    res.json({ bots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get bot by slug
router.get('/:slug', async (req, res) => {
  try {
    const bot = await Bot.findOne({ slug: req.params.slug, isActive: true });
    if (!bot) return res.status(404).json({ error: 'Bot not found.' });
    res.json({ bot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User's session history
router.get('/sessions/history', authenticate, async (req, res) => {
  try {
    const sessions = await BotSession.find({ user: req.user._id })
      .populate('bot', 'name tier')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Active sessions (in-memory engine removed) — return empty list for now
router.get('/sessions/active', authenticate, (req, res) => {
  res.json({ sessions: [] });
});

// ─── ACTIONS DISABLED (MT5 integration via dashboard) ──────────

const MIGRATION_MSG = 'Le système de bots est en cours de migration vers MT4/MT5. Utilisez le tableau de bord MT5 en attendant.';

router.post('/:slug/start', authenticate, (req, res) => {
  res.status(503).json({ error: MIGRATION_MSG, code: 'MIGRATION_IN_PROGRESS' });
});

router.post('/session/:sessionId/stop', authenticate, (req, res) => {
  res.status(503).json({ error: MIGRATION_MSG, code: 'MIGRATION_IN_PROGRESS' });
});

router.post('/session/:sessionId/pause', authenticate, (req, res) => {
  res.status(503).json({ error: MIGRATION_MSG, code: 'MIGRATION_IN_PROGRESS' });
});

router.post('/session/:sessionId/resume', authenticate, (req, res) => {
  res.status(503).json({ error: MIGRATION_MSG, code: 'MIGRATION_IN_PROGRESS' });
});

router.post('/manual-trade', authenticate, (req, res) => {
  res.status(503).json({ error: MIGRATION_MSG, code: 'MIGRATION_IN_PROGRESS' });
});

module.exports = router;
