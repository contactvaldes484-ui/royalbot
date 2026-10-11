const mongoose = require('mongoose');

/**
 * User-defined alert rules for AI signals.
 * The scanner checks these on every cycle and fires notifications when matched.
 */
const ForexAlertSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  // Targeting
  symbols: { type: [String], default: [] },           // empty = all
  timeframes: { type: [String], default: [] },        // empty = all
  signals: { type: [String], default: ['buy', 'sell'] }, // which signals trigger
  minConfidence: { type: Number, default: 70 },

  // Conditions (any of these match → fire)
  triggerOn: {
    type: [String],
    default: ['bos', 'choch', 'fvg', 'order_block', 'breakout', 'fake_breakout'],
  },

  // Channels
  channels: {
    push: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    telegram: { type: Boolean, default: false },
    websocket: { type: Boolean, default: true },
  },

  // Anti-spam — minimum delay between alerts for the same (symbol, TF, signal)
  cooldownMinutes: { type: Number, default: 30 },

  enabled: { type: Boolean, default: true },
  label: { type: String, default: '' },

  // Stats
  triggered: { type: Number, default: 0 },
  lastTriggeredAt: { type: Date },
  lastFiredKey: { type: String, default: '' },        // "symbol:tf:signal" of last fire (for cooldown check)
}, { timestamps: true });

module.exports = mongoose.model('ForexAlert', ForexAlertSchema);
