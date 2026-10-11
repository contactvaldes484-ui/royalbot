const express = require('express');
const Trade = require('../models/Trade');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get user trades
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50, contractType, result, bot, startDate, endDate } = req.query;
    const query = { user: req.user._id };

    if (contractType) query.contractType = contractType;
    if (result) query.result = result;
    if (bot) query.bot = bot;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const trades = await Trade.find(query)
      .populate('bot', 'name tier')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Trade.countDocuments(query);

    res.json({
      trades,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get trade by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const trade = await Trade.findOne({ _id: req.params.id, user: req.user._id })
      .populate('bot', 'name tier');
    if (!trade) return res.status(404).json({ error: 'Trade not found.' });
    res.json({ trade });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get trade stats summary
router.get('/stats/summary', authenticate, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const periodMap = { '24h': 1, '7d': 7, '30d': 30, '90d': 90, 'all': 3650 };
    const days = periodMap[period] || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const trades = await Trade.find({ user: req.user._id, createdAt: { $gte: startDate } });

    const stats = {
      totalTrades: trades.length,
      wins: trades.filter(t => t.result === 'win').length,
      losses: trades.filter(t => t.result === 'loss').length,
      totalProfit: trades.reduce((sum, t) => sum + (t.profit || 0), 0),
      totalStaked: trades.reduce((sum, t) => sum + (t.stake || 0), 0),
      avgStake: trades.length > 0 ? trades.reduce((sum, t) => sum + (t.stake || 0), 0) / trades.length : 0,
      bestTrade: Math.max(...trades.map(t => t.profit || 0), 0),
      worstTrade: Math.min(...trades.map(t => t.profit || 0), 0),
      winRate: trades.length > 0 ? (trades.filter(t => t.result === 'win').length / trades.length * 100) : 0
    };

    // Daily profit breakdown
    const dailyProfits = {};
    trades.forEach(t => {
      const day = t.createdAt.toISOString().split('T')[0];
      if (!dailyProfits[day]) dailyProfits[day] = 0;
      dailyProfits[day] += t.profit || 0;
    });

    res.json({ stats, dailyProfits });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
