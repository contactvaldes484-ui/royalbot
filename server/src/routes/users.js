const express = require('express');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Update profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { firstName, lastName, avatar, telegramChatId, whatsappNumber, notificationsEnabled } = req.body;
    const updates = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (avatar !== undefined) updates.avatar = avatar;
    if (telegramChatId !== undefined) updates.telegramChatId = telegramChatId;
    if (whatsappNumber !== undefined) updates.whatsappNumber = whatsappNumber;
    if (notificationsEnabled !== undefined) updates.notificationsEnabled = notificationsEnabled;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ user: user.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user stats (computed from Trade model)
router.get('/stats', authenticate, async (req, res) => {
  try {
    const Trade = require('../models/Trade');
    const trades = await Trade.find({ user: req.user._id });

    const totalTrades = trades.length;
    const wins = trades.filter(t => t.result === 'win').length;
    const losses = trades.filter(t => t.result === 'loss').length;
    const totalProfit = trades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const winRate = totalTrades > 0 ? (wins / totalTrades * 100).toFixed(2) : 0;

    let runningProfit = 0;
    const equityCurve = trades.map(t => {
      runningProfit += t.profit || 0;
      return { date: t.createdAt, equity: runningProfit };
    });

    const contractStats = {};
    trades.forEach(t => {
      if (!contractStats[t.contractType]) {
        contractStats[t.contractType] = { wins: 0, losses: 0, profit: 0, total: 0 };
      }
      contractStats[t.contractType].total++;
      if (t.result === 'win') contractStats[t.contractType].wins++;
      else contractStats[t.contractType].losses++;
      contractStats[t.contractType].profit += t.profit || 0;
    });

    res.json({
      totalTrades,
      wins,
      losses,
      totalProfit: totalProfit.toFixed(2),
      winRate,
      equityCurve,
      contractStats,
      commissionOwed: req.user.commissionOwed || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle demo mode
router.post('/toggle-demo', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.isDemoMode = !user.isDemoMode;
    if (user.isDemoMode && user.demoBalance <= 0) {
      user.demoBalance = 10000;
    }
    await user.save();
    res.json({ isDemoMode: user.isDemoMode, demoBalance: user.demoBalance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
