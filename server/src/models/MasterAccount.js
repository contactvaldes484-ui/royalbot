const mongoose = require('mongoose');

/**
 * MasterAccount — a publishable bot profile that followers can copy.
 *
 * Source: a Binance RobotSession running an automated robot (master = robot).
 * Once approved by admin, masters appear in the public leaderboard.
 */
const equityPointSchema = new mongoose.Schema({
  t: Date,
  equity: Number,
  balance: Number,
  drawdown: Number,
}, { _id: false });

const MasterAccountSchema = new mongoose.Schema({
  // Ownership
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  // Public profile
  slug: { type: String, unique: true, required: true, lowercase: true, trim: true, index: true },
  displayName: { type: String, required: true, trim: true },
  bio: { type: String, default: '', maxlength: 500 },
  avatar: { type: String, default: '' },
  country: { type: String, default: '' },
  tradingStyle: { type: String, enum: ['scalper', 'day_trader', 'swing', 'position', 'mixed'], default: 'mixed' },
  riskLevel: { type: String, enum: ['low', 'medium', 'high', 'extreme'], default: 'medium' },
  badges: [{ type: String }], // ['verified', 'top_trader', 'consistent', 'pro_pick', ...]

  // Source: a Binance robot session (master = automated robot)
  sourceType: { type: String, enum: ['bot'], default: 'bot', index: true },
  robotSession: { type: mongoose.Schema.Types.ObjectId, ref: 'RobotSession' },     // session robot Binance (master)
  binanceAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'BinanceAccount' },
  robotKey: { type: String, default: '' },                                         // stratégie (free_trend, vip_quantum, …)
  market: { type: String, enum: ['spot', 'futures'], default: 'spot' },

  // Status / moderation
  status: { type: String, enum: ['pending', 'approved', 'suspended', 'rejected'], default: 'pending', index: true },
  isVisible: { type: Boolean, default: true },
  rejectionReason: { type: String, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },

  // Commercial
  feePct: { type: Number, default: 0, min: 0, max: 50 },   // performance fee charged per profitable trade
  minCapital: { type: Number, default: 100 },              // recommended min capital for followers
  maxFollowers: { type: Number, default: 0 },              // 0 = unlimited

  // Live stats (computed regularly)
  stats: {
    startBalance: { type: Number, default: 0 },
    currentEquity: { type: Number, default: 0 },
    totalProfit:   { type: Number, default: 0 },
    totalTrades:   { type: Number, default: 0 },
    wins:          { type: Number, default: 0 },
    losses:        { type: Number, default: 0 },
    winRate:       { type: Number, default: 0 },           // %
    roi:           { type: Number, default: 0 },           // %
    avgWin:        { type: Number, default: 0 },
    avgLoss:       { type: Number, default: 0 },
    profitFactor:  { type: Number, default: 0 },
    maxDrawdown:   { type: Number, default: 0 },           // %
    currentDrawdown: { type: Number, default: 0 },         // %
    sharpe:        { type: Number, default: 0 },
    activeDays:    { type: Number, default: 0 },
    lastTradeAt:   { type: Date },
  },

  // AI risk monitoring snapshot
  aiRisk: {
    score: { type: Number, default: 50 },                  // 0=safe, 100=very dangerous
    flag: { type: String, enum: ['safe', 'warning', 'danger', 'critical'], default: 'safe' },
    reason: { type: String, default: '' },
    lastCheckedAt: { type: Date },
  },

  // Equity curve (most recent 200 points, ~1 per session-update or daily)
  equityCurve: { type: [equityPointSchema], default: [] },

  // Aggregated
  followersCount: { type: Number, default: 0, index: true },
  totalCopiedTrades: { type: Number, default: 0 },
  totalCopiedVolume: { type: Number, default: 0 },
}, { timestamps: true });

MasterAccountSchema.index({ status: 1, isVisible: 1, 'stats.roi': -1 });

module.exports = mongoose.model('MasterAccount', MasterAccountSchema);
