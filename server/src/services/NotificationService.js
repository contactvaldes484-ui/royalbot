'use strict';
const Notification = require('../models/Notification');
const User = require('../models/User');
const nodemailer = require('nodemailer');

let transporter = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function _telegram(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  }).catch(() => {});
}

class NotificationService {
  async _dispatch(userId, { type, title, body, channels = ['inapp'] }) {
    await Notification.create({ user: userId, type, title, body, channels }).catch(() => {});
    if (global.broadcastToUser) global.broadcastToUser(userId.toString(), { type: 'notification', title, body, kind: type });

    if (channels.includes('email') || channels.includes('telegram')) {
      const user = await User.findById(userId).select('email telegramChatId notificationsEnabled');
      if (!user || user.notificationsEnabled === false) return;
      if (channels.includes('email') && transporter && user.email) {
        transporter.sendMail({ from: process.env.SMTP_USER, to: user.email, subject: title, text: body }).catch(() => {});
      }
      if (channels.includes('telegram') && user.telegramChatId) {
        _telegram(user.telegramChatId, `<b>${title}</b>\n${body}`);
      }
    }
  }

  tradeOpened(userId, { symbol, side, qty, price, sl, tp, robotKey }) {
    return this._dispatch(userId, {
      type: 'trade_opened',
      title: `🟢 Position ouverte — ${symbol}`,
      body: `${robotKey} : ${side} ${qty} ${symbol} @ ${price}\nSL ${sl} / TP ${tp}`,
      channels: ['inapp', 'telegram'],
    });
  }

  tradeClosed(userId, { symbol, pnl, robotKey, reason }) {
    const win = pnl >= 0;
    return this._dispatch(userId, {
      type: 'trade_closed',
      title: `${win ? '✅' : '🔴'} Position fermée — ${symbol}`,
      body: `${robotKey} : ${win ? '+' : ''}${Number(pnl).toFixed(2)} USDT${reason ? ` (${reason})` : ''}`,
      channels: ['inapp', 'telegram'],
    });
  }

  riskAlert(userId, message) {
    return this._dispatch(userId, { type: 'risk', title: '⚠️ Protection risque', body: message, channels: ['inapp', 'email', 'telegram'] });
  }
}

module.exports = new NotificationService();
