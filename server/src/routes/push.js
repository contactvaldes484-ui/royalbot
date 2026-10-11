const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const pushService = require('../services/pushNotifications');

router.get('/vapid-key', (req, res) => {
  res.json({ publicKey: pushService.getVapidPublicKey() });
});

router.post('/subscribe', authenticate, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription) return res.status(400).json({ error: 'subscription required' });
    await pushService.saveSubscription(req.user._id, subscription);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/unsubscribe', authenticate, async (req, res) => {
  try {
    const { endpoint } = req.body;
    await pushService.removeSubscription(req.user._id, endpoint);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
