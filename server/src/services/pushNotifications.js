let webpush;
try {
  webpush = require('web-push');
} catch (_) {
  webpush = null;
}

const User = require('../models/User');

class PushNotificationService {
  constructor() {
    this.initialized = false;
    this.init();
  }

  init() {
    if (!webpush) return;
    const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL } = process.env;
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.warn('⚠️  VAPID keys not set — push notifications disabled');
      return;
    }
    webpush.setVapidDetails(
      VAPID_EMAIL || 'mailto:admin@ultimatebot.com',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
    this.initialized = true;
    console.log('✅ Push notifications initialized');
  }

  getVapidPublicKey() {
    return process.env.VAPID_PUBLIC_KEY || '';
  }

  async saveSubscription(userId, subscription) {
    try {
      await User.findByIdAndUpdate(userId, {
        $addToSet: { pushSubscriptions: subscription }
      });
      return true;
    } catch (_) { return false; }
  }

  async removeSubscription(userId, endpoint) {
    try {
      await User.findByIdAndUpdate(userId, {
        $pull: { pushSubscriptions: { endpoint } }
      });
      return true;
    } catch (_) { return false; }
  }

  async sendToUser(userId, payload) {
    if (!this.initialized) return;
    try {
      const user = await User.findById(userId).select('pushSubscriptions');
      if (!user?.pushSubscriptions?.length) return;

      const message = JSON.stringify(payload);
      const failed = [];

      await Promise.all(
        user.pushSubscriptions.map(async (sub) => {
          try {
            await webpush.sendNotification(sub, message);
          } catch (err) {
            if (err.statusCode === 410 || err.statusCode === 404) {
              failed.push(sub.endpoint);
            }
          }
        })
      );

      // Remove expired subscriptions
      if (failed.length > 0) {
        await User.findByIdAndUpdate(userId, {
          $pull: { pushSubscriptions: { endpoint: { $in: failed } } }
        });
      }
    } catch (_) {}
  }

  async sendTradeNotification(userId, trade) {
    const isProfit = trade.profit >= 0;
    await this.sendToUser(userId, {
      title: `${isProfit ? '✅' : '❌'} Trade ${isProfit ? 'Gagné' : 'Perdu'}`,
      body: `${trade.symbol} ${trade.type?.toUpperCase()} — ${isProfit ? '+' : ''}$${Number(trade.profit).toFixed(2)}`,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      data: { type: 'trade', tradeId: trade._id },
      tag: 'trade-result',
    });
  }

  async sendBotNotification(userId, message) {
    await this.sendToUser(userId, {
      title: '🤖 UltimateBot Bot',
      body: message,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: 'bot-update',
    });
  }

  async sendGlobalNotification(title, body, type = 'info') {
    if (!this.initialized) return;
    try {
      const users = await User.find({ pushSubscriptions: { $exists: true, $ne: [] } }).select('_id');
      await Promise.all(users.map(u => this.sendToUser(u._id.toString(), {
        title,
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        tag: `global-${Date.now()}`,
        data: { type },
      })));
    } catch (_) {}
  }
}

module.exports = new PushNotificationService();
