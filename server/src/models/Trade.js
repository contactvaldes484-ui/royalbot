const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  bot: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot' },
  
  // Trade info
  contractId: { type: String },
  contractType: { 
    type: String, 
    enum: ['BUY', 'SELL', 'BUY_LIMIT', 'SELL_LIMIT', 'BUY_STOP', 'SELL_STOP'],
    required: true 
  },
  symbol: { type: String, required: true },
  
  // Trade details
  stake: { type: Number, required: true },
  payout: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },
  entryPrice: { type: Number },
  exitPrice: { type: Number },
  barrier: { type: String },
  duration: { type: Number },
  durationUnit: { type: String, enum: ['t', 's', 'm', 'h', 'd'], default: 't' },
  
  // Digit specific
  digitPrediction: { type: Number, min: 0, max: 9 },
  digitResult: { type: Number, min: 0, max: 9 },
  
  // Result
  result: { type: String, enum: ['win', 'loss', 'pending', 'cancelled'], default: 'pending' },
  
  // Strategy info
  strategy: { type: String },
  martingaleLevel: { type: Number, default: 0 },
  
  // Timing
  openTime: { type: Date, default: Date.now },
  closeTime: { type: Date },
  
  // Session
  sessionId: { type: String },
  isDemo: { type: Boolean, default: false },
  isManual: { type: Boolean, default: false },
  details: { type: mongoose.Schema.Types.Mixed }
}, {
  timestamps: true
});

tradeSchema.index({ user: 1, createdAt: -1 });
tradeSchema.index({ user: 1, result: 1 });
tradeSchema.index({ bot: 1, createdAt: -1 });

module.exports = mongoose.model('Trade', tradeSchema);
