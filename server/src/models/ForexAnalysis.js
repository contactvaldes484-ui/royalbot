const mongoose = require('mongoose');

/**
 * Cached AI analysis result for a (symbol, timeframe) pair.
 * Re-computed periodically by the scanner or on-demand by user requests.
 */
const ForexAnalysisSchema = new mongoose.Schema({
  symbol: { type: String, required: true, index: true },
  timeframe: { type: String, required: true, index: true },
  strategy: { type: String, default: 'smc', index: true },
  strategyLabel: { type: String, default: '' },

  // Snapshot context
  lastPrice: { type: Number, required: true },
  spread: { type: Number, default: 0 },
  computedAt: { type: Date, default: Date.now, index: true },

  // Momentum indicators snapshot
  indicators: { type: Object, default: {} },

  // Market structure
  trend: { type: String, enum: ['bullish', 'bearish', 'ranging'], default: 'ranging' },
  trendStrength: { type: Number, default: 0 },           // 0-100
  bias: { type: String, enum: ['long', 'short', 'neutral'], default: 'neutral' },

  // Detected patterns (arrays so we can show all on chart)
  swingHighs: { type: Array, default: [] },              // [{ index, time, price }]
  swingLows: { type: Array, default: [] },
  supportLevels: { type: Array, default: [] },           // [{ price, touches, strength }]
  resistanceLevels: { type: Array, default: [] },

  orderBlocks: { type: Array, default: [] },             // [{ side, top, bottom, time, mitigated }]
  fvgs: { type: Array, default: [] },                    // [{ side, top, bottom, time, mitigated }]

  liquidityZones: { type: Array, default: [] },          // [{ side, price, touches }]
  bos: { type: Array, default: [] },                     // [{ time, price, side }]  Break of Structure
  choch: { type: Array, default: [] },                   // [{ time, price, side }] Change of Character
  breakouts: { type: Array, default: [] },               // [{ time, price, side, fake }]

  // Setup / signal
  signal: { type: String, enum: ['buy', 'sell', 'wait'], default: 'wait' },
  confidence: { type: Number, default: 0 },              // 0-100
  probability: { type: Number, default: 0 },             // 0-100 (estimated win probability)

  // Trade plan
  entry: { type: Number },
  stopLoss: { type: Number },
  takeProfit1: { type: Number },
  takeProfit2: { type: Number },
  riskReward: { type: Number },

  // Explainability
  reasonsBullish: { type: [String], default: [] },
  reasonsBearish: { type: [String], default: [] },
  scenarioBullish: { type: String, default: '' },
  scenarioBearish: { type: String, default: '' },
  aiSummary: { type: String, default: '' },

  // Confluence with HTF
  htfAlignment: { type: Number, default: 0 },            // -100 (full bear) to +100 (full bull)
}, { timestamps: true });

ForexAnalysisSchema.index({ symbol: 1, timeframe: 1, strategy: 1, computedAt: -1 });

module.exports = mongoose.model('ForexAnalysis', ForexAnalysisSchema);
