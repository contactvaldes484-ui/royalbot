const express = require('express');
const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Request withdrawal
router.post('/', authenticate, async (req, res) => {
  try {
    const { amount, method, walletAddress } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount.' });
    if (!method) return res.status(400).json({ error: 'Payment method required.' });

    const user = req.user;
    const plan = user.subscription?.plan || 'free';
    const commissionRate = plan === 'free' ? 10 : 0;
    const commission = (amount * commissionRate) / 100;
    const netAmount = amount - commission;

    const withdrawal = await Withdrawal.create({
      user: user._id,
      amount,
      commission,
      commissionRate,
      netAmount,
      method,
      walletAddress,
      status: 'pending'
    });

    if (commission > 0) {
      await User.findByIdAndUpdate(user._id, { $inc: { commissionOwed: commission } });
    }

    res.status(201).json({ withdrawal, message: `Withdrawal requested. Commission: $${commission.toFixed(2)}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user withdrawals
router.get('/', authenticate, async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ withdrawals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
