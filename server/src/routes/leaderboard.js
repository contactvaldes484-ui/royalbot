const express = require('express');
const User = require('../models/User');
const Trade = require('../models/Trade');

const router = express.Router();

// Get leaderboard
router.get('/', async (req, res) => {
  try {
    const { period = '30d', limit = 20 } = req.query;
    const days = { '7d': 7, '30d': 30, '90d': 90, 'all': 3650 }[period] || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const leaderboard = await Trade.aggregate([
      { $match: { createdAt: { $gte: startDate }, isDemo: false } },
      {
        $group: {
          _id: '$user',
          totalProfit: { $sum: '$profit' },
          totalTrades: { $sum: 1 },
          wins: { $sum: { $cond: [{ $eq: ['$result', 'win'] }, 1, 0] } }
        }
      },
      { $addFields: { winRate: { $multiply: [{ $divide: ['$wins', '$totalTrades'] }, 100] } } },
      { $sort: { totalProfit: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 1,
          totalProfit: 1,
          totalTrades: 1,
          wins: 1,
          winRate: 1,
          'user.firstName': 1,
          'user.lastName': 1,
          'user.avatar': 1,
          'user.subscription.plan': 1
        }
      }
    ]);

    res.json({ leaderboard });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
