const mongoose = require('mongoose');

const botSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  tier: { type: String, required: true }, // flexible: admin defines plan name (e.g. starter, pro, elite, gold, custom…)
  description: { type: String },

  // Supported platforms — each bot can trade on any combination
  platforms: [{ type: String, enum: ['mt4', 'mt5'] }],
  
  // Supported order types
  supportedContracts: [{ 
    type: String, 
    enum: ['BUY', 'SELL', 'BUY_LIMIT', 'SELL_LIMIT', 'BUY_STOP', 'SELL_STOP'] 
  }],
  
  // Supported symbols
  supportedSymbols: [{ type: String }],

  // MT5-specific settings
  mt5Settings: {
    strategy: { type: String, default: 'scalper_ema' },
    timeframes: [{ type: String }],
    maxOpenTrades: { type: Number, default: 3 },
    trailingStop: { type: Boolean, default: true },
    trailingStopPips: { type: Number, default: 15 },
    sessionFilter: { type: Boolean, default: true },
    newsFilter: { type: Boolean, default: false },
    maxDailyLoss: { type: Number, default: 5 },
  },
  
  // Capital & trade requirements
  minCapital: { type: Number, default: 0 },       // minimum balance required
  minTradeAmount: { type: Number, default: 0.35 }, // minimum trade/stake amount
  
  // Default settings
  defaultSettings: {
    initialStake: { type: Number, default: 1 },
    maxStake: { type: Number, default: 50 },
    stopLoss: { type: Number, default: 50 },
    takeProfit: { type: Number, default: 100 },
    maxTradesPerSession: { type: Number, default: 50 },
    martingaleEnabled: { type: Boolean, default: false },
    martingaleMultiplier: { type: Number, default: 2 },
    martingaleMaxSteps: { type: Number, default: 4 },
    antiLossEnabled: { type: Boolean, default: true },
    drawdownPausePercent: { type: Number, default: 20 },
    cooldownSeconds: { type: Number, default: 3 },
    riskPercent: { type: Number, default: 1 },
    maxLotSize: { type: Number, default: 0.1 },
  },
  
  // Features
  features: [{ type: String }],
  
  // Pricing
  price: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  billingCycle: { type: String, enum: ['free', 'monthly', 'quarterly', 'yearly', 'lifetime'], default: 'monthly' },
  commissionRate: { type: Number, default: 0 },
  accessType: { type: String, enum: ['purchase', 'rental', 'subscription'], default: 'purchase' },
  
  // Stats
  totalUsers: { type: Number, default: 0 },
  avgWinRate: { type: Number, default: 0 },
  avgProfit: { type: Number, default: 0 },
  ratingAverage: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  
  // Status
  isActive: { type: Boolean, default: true },
  isPopular: { type: Boolean, default: false },
  version: { type: String, default: '1.0.0' },
  order: { type: Number, default: 0 },
  listingStatus: { type: String, enum: ['draft', 'pending', 'approved', 'rejected'], default: 'approved', index: true },
  securityStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  securityNotes: { type: String, default: '' },
  
  // Uploaded robot file (EA for MT4/MT5)
  robotFile: { type: String, default: '' },         // base64 encoded file content
  robotFileName: { type: String, default: '' },     // original filename
  robotFileType: { type: String, default: '' },     // mime type (text/xml, etc.)
  isUploaded: { type: Boolean, default: false },    // true if robot was uploaded by admin

  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  screenshots: [{ type: String }],
  videoUrls: [{ type: String }],

  // Display
  icon: { type: String },
  color: { type: String },
  badge: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('Bot', botSchema);
