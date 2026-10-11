const mongoose = require('mongoose');

const botSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  bot: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', required: true },
  sessionId: { type: String, required: true, unique: true },
  
  // Settings for this session
  settings: {
    initialStake: { type: Number, default: 1 },
    maxStake: { type: Number, default: 50 },
    stopLoss: { type: Number, default: 50 },
    takeProfit: { type: Number, default: 100 },
    maxTrades: { type: Number, default: 50 },
    contractType: { type: String },
    symbol: { type: String },
    martingaleEnabled: { type: Boolean, default: false },
    martingaleMultiplier: { type: Number, default: 2 },
    martingaleMaxSteps: { type: Number, default: 4 }
  },
  
  // Session stats
  totalTrades: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },
  maxDrawdown: { type: Number, default: 0 },
  startBalance: { type: Number, default: 0 },
  endBalance: { type: Number, default: 0 },
  
  // Status
  status: { type: String, enum: ['running', 'paused', 'stopped', 'completed', 'error'], default: 'running' },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  pauseReason: { type: String },
  errorMessage: { type: String },
  
  isDemo: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('BotSession', botSessionSchema);
