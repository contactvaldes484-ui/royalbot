const mongoose = require('mongoose');

/**
 * Singleton config for the Forex AI engine — tunable by admin.
 * Use ForexAIConfig.getSingleton() to fetch/create.
 */
const ForexAIConfigSchema = new mongoose.Schema({
  // Symbols to scan periodically
  symbols: { type: [String], default: [
    'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF',
    'EURJPY', 'GBPJPY', 'EURGBP', 'XAUUSD', 'XAGUSD', 'BTCUSD',
  ] },
  // Timeframes to analyze (Yahoo Finance compatible)
  timeframes: { type: [String], default: ['5m', '15m', '1h', '4h', '1d'] },

  // Scanner cadence (ms) — periodic full scan
  scannerIntervalMs: { type: Number, default: 5 * 60_000 },   // 5 min
  // Single-analysis cache TTL (ms) — avoid recomputing the same TF too often
  cacheTtlMs: { type: Number, default: 2 * 60_000 },          // 2 min

  // Swing-point lookback (bars on each side to qualify a pivot)
  swingLookback: { type: Number, default: 3 },
  // Number of candles to fetch per TF
  candleCount:   { type: Number, default: 200 },

  // Pattern sensitivity (0-100). Higher = more strict (fewer signals).
  sensitivity: { type: Number, default: 60 },

  // Minimum confidence (0-100) for a setup to appear in scanner top picks
  minConfidence: { type: Number, default: 65 },
  // Minimum confidence to fire alerts to users
  alertMinConfidence: { type: Number, default: 75 },

  // Enable / disable
  enabled: { type: Boolean, default: true },
  alertsEnabled: { type: Boolean, default: true },

  // Data provider
  dataProvider: { type: String, enum: ['yahoo', 'twelvedata', 'synthetic'], default: 'yahoo' },
  twelveDataApiKey: { type: String, default: '' },

  // Stats / health
  lastScanAt: { type: Date },
  lastScanDurationMs: { type: Number, default: 0 },
  totalScansRun: { type: Number, default: 0 },
  totalAnalysesGenerated: { type: Number, default: 0 },
  totalAlertsFired: { type: Number, default: 0 },
}, { timestamps: true });

ForexAIConfigSchema.statics.getSingleton = async function () {
  let cfg = await this.findOne();
  if (!cfg) cfg = await this.create({});
  return cfg;
};

module.exports = mongoose.model('ForexAIConfig', ForexAIConfigSchema);
