const mongoose = require('mongoose');

const DerivSessionSchema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  derivAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'DerivAccount', required: true },
  bot:          { type: mongoose.Schema.Types.ObjectId, ref: 'DerivBot', required: true },
  botName:      { type: String, default: 'Robot Deriv' },

  symbol:       { type: String, required: true },
  contractType: { type: String, required: true },

  settings: {
    initialStake:         { type: Number, default: 1 },
    maxStake:             { type: Number, default: 50 },
    stopLoss:             { type: Number, default: 20 },
    takeProfit:           { type: Number, default: 50 },
    duration:             { type: Number, default: 5 },
    durationUnit:         { type: String, default: 't' },
    barrier:              { type: String, default: '5' },
    martingaleMultiplier: { type: Number, default: 2 },
    maxMartingaleSteps:   { type: Number, default: 4 },
  },

  stats: {
    totalTrades:       { type: Number, default: 0 },
    wins:              { type: Number, default: 0 },
    losses:            { type: Number, default: 0 },
    netProfit:         { type: Number, default: 0 },
    currentStake:      { type: Number, default: 1 },
    consecutiveLosses: { type: Number, default: 0 },
    startBalance:      { type: Number, default: 0 },
  },

  status:    { type: String, enum: ['active', 'paused', 'stopped'], default: 'active', index: true },
  lastTradeAt: { type: Date, default: null },
  startedAt:   { type: Date, default: Date.now },
  stoppedAt:   { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('DerivSession', DerivSessionSchema);
