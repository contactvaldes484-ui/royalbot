const express = require('express');
const Bot = require('../models/Bot');
const RobotReview = require('../models/RobotReview');
const User = require('../models/User');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get public reviews for a robot
router.get('/:slug', async (req, res) => {
  try {
    const bot = await Bot.findOne({ slug: req.params.slug, isActive: true });
    if (!bot) return res.status(404).json({ error: 'Robot not found.' });

    const reviews = await RobotReview.find({ robot: bot._id, status: 'visible' })
      .populate('user', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create or update a review (must own the robot)
router.post('/:slug', authenticate, async (req, res) => {
  try {
    const { rating, title, comment } = req.body;
    const bot = await Bot.findOne({ slug: req.params.slug, isActive: true });
    if (!bot) return res.status(404).json({ error: 'Robot not found.' });

    const user = await User.findById(req.user._id).select('purchasedBots');
    const owns = user.purchasedBots?.some(id => id.toString() === bot._id.toString());
    if (!owns) {
      return res.status(403).json({ error: 'Vous devez avoir acheté ce robot pour laisser un avis.' });
    }

    const safeRating = Math.max(1, Math.min(5, Number(rating || 0)));

    const existing = await RobotReview.findOne({ robot: bot._id, user: req.user._id });
    if (existing) {
      existing.rating = safeRating;
      existing.title = title || '';
      existing.comment = comment || '';
      existing.status = 'visible';
      existing.abuseReported = false;
      existing.abuseReason = '';
      await existing.save();
    } else {
      await RobotReview.create({
        robot: bot._id,
        user: req.user._id,
        rating: safeRating,
        title: title || '',
        comment: comment || '',
      });
    }

    // Recompute ratingAverage & ratingCount
    const agg = await RobotReview.aggregate([
      { $match: { robot: bot._id, status: 'visible' } },
      { $group: { _id: '$robot', count: { $sum: 1 }, avg: { $avg: '$rating' } } },
    ]);
    const stats = agg[0] || { count: 0, avg: 0 };
    bot.ratingAverage = stats.avg || 0;
    bot.ratingCount = stats.count || 0;
    await bot.save();

    const reviews = await RobotReview.find({ robot: bot._id, status: 'visible' })
      .populate('user', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(201).json({ reviews, ratingAverage: bot.ratingAverage, ratingCount: bot.ratingCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Report abuse on a review
router.post('/:id/report', authenticate, async (req, res) => {
  try {
    const { reason } = req.body;
    const review = await RobotReview.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    review.abuseReported = true;
    review.abuseReason = reason || '';
    await review.save();

    res.json({ review });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: list reported reviews
router.get('/admin/reported', authenticate, requireAdmin, async (req, res) => {
  try {
    const reviews = await RobotReview.find({ abuseReported: true })
      .populate('user', 'firstName lastName email')
      .populate('robot', 'name slug')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: hide/show a review
router.put('/admin/:id/visibility', authenticate, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['visible', 'hidden'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const review = await RobotReview.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    review.status = status;
    if (status === 'visible') {
      review.abuseReported = false;
      review.abuseReason = '';
    }
    await review.save();

    // Recompute bot rating
    const bot = await Bot.findById(review.robot);
    if (bot) {
      const agg = await RobotReview.aggregate([
        { $match: { robot: bot._id, status: 'visible' } },
        { $group: { _id: '$robot', count: { $sum: 1 }, avg: { $avg: '$rating' } } },
      ]);
      const stats = agg[0] || { count: 0, avg: 0 };
      bot.ratingAverage = stats.avg || 0;
      bot.ratingCount = stats.count || 0;
      await bot.save();
    }

    res.json({ review });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
