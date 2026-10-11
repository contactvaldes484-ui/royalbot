const mongoose = require('mongoose');

const RobotSessionSchema = new mongoose.Schema({
  user:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  exchange:       { type: String, enum: ['binance', 'bybit'], default: 'binance', index: true },
  binanceAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'BinanceAccount' },
  bybitAccount:   { type: mongoose.Schema.Types.ObjectId, ref: 'BybitAccount' },
  robotKey:       { type: String, required: true },
  market:         { type: String, enum: ['spot', 'futures'], required: true },
  status:         { type: String, enum: ['active', 'paused', 'stopped', 'error'], default: 'active', index: true },

  settings: {
    symbols:       [{ type: String }],
    leverage:      { type: Number, default: 5 },
    maxOpenTrades: { type: Number, default: 2 },
    timeframe:     { type: String, default: '5m' },
    // Ajustement des lots par l'utilisateur :
    //  - 'risk'       : taille = (equity * risk%) / distance SL   (défaut)
    //  - 'fixed'      : taille = fixedNotionalUsd (montant fixe en USDT par trade)
    //  - 'multiplier' : taille = base 'risk' × lotMultiplier
    sizingMode:       { type: String, enum: ['risk', 'fixed', 'multiplier'], default: 'risk' },
    fixedNotionalUsd: { type: Number, default: 0 },   // utilisé si sizingMode = 'fixed'
    lotMultiplier:    { type: Number, default: 1 },   // utilisé si sizingMode = 'multiplier'
  },

  risk: {
    riskPercent:     { type: Number, default: 1 },
    maxDailyLossPct: { type: Number, default: 5 },
    maxDrawdownPct:  { type: Number, default: 15 },
    requireStopLoss: { type: Boolean, default: true },
    cooldownSeconds: { type: Number, default: 30 },
    maxTradesPerDay: { type: Number, default: 50 },
    trailingStop:    { type: Boolean, default: false },
    trailingPct:     { type: Number, default: 0.5 },
  },

  stats: {
    totalTrades:  { type: Number, default: 0 },
    wins:         { type: Number, default: 0 },
    losses:       { type: Number, default: 0 },
    totalPnl:     { type: Number, default: 0 },
    dailyPnl:     { type: Number, default: 0 },
    startEquity:  { type: Number, default: 0 },
    peakEquity:   { type: Number, default: 0 },
    maxDrawdown:  { type: Number, default: 0 },
    lastResetDay: { type: String, default: '' },
  },

  startedAt:   { type: Date, default: Date.now },
  stoppedAt:   { type: Date },
  lastTradeAt: { type: Date },
}, { timestamps: true });

RobotSessionSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('RobotSession', RobotSessionSchema);
