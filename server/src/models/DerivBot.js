const mongoose = require('mongoose');

const DerivBotSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  slug:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  tier:        { type: String, enum: ['deriv-starter', 'deriv-pro', 'all'], default: 'all' },
  description: { type: String, default: '' },

  // Type de contrat Deriv SmartTrader
  contractType: {
    type: String,
    enum: [
      'DIGITOVER', 'DIGITUNDER', 'DIGITMATCH', 'DIGITDIFF',
      'DIGITEVEN', 'DIGITODD', 'CALL', 'PUT', 'MULTUP', 'MULTDOWN'
    ],
    default: 'DIGITOVER',
  },

  // Instruments supportés (Indices synthétiques, Crash/Boom, Forex...)
  symbols: [{ type: String }],

  // Logique algorithmique
  strategyType: {
    type: String,
    enum: [
      'digit_analyzer',    // Analyse statistique des 50 derniers ticks
      'trend_following',   // Suivi de tendance momentum
      'reversal_rsi',      // Rebond sur sur-achat / sur-vente
      'martingale_smart',  // Martingale sécurisée avec pallier stop
      'even_odd_pattern',  // Reconnaissance de séries Pair/Impair
      'tick_volatility',   // Breakout de volatilité
      'file_custom',       // Exécuté d'après fichier XML / JSON Deriv Bot
    ],
    default: 'digit_analyzer',
  },

  // Fichier robot Deriv (XML DBot / JSON)
  fileName:    { type: String, default: '' },
  fileType:    { type: String, enum: ['xml', 'json', 'none'], default: 'none' },
  fileContent: { type: String, default: '', select: false },
  parsedLogic: { type: mongoose.Schema.Types.Mixed, default: {} },

  defaultSettings: {
    initialStake:         { type: Number, default: 1 },
    maxStake:             { type: Number, default: 50 },
    stopLoss:             { type: Number, default: 20 },
    takeProfit:           { type: Number, default: 50 },
    duration:             { type: Number, default: 1 },
    durationUnit:         { type: String, enum: ['t', 's', 'm', 'h'], default: 't' },
    barrier:              { type: String, default: '2' },
    martingaleMultiplier: { type: Number, default: 2 },
    maxMartingaleSteps:   { type: Number, default: 2 },
    cooldownSeconds:      { type: Number, default: 2 },
  },

  winRate:    { type: String, default: '70-75%' },
  badge:      { type: String, default: 'Automatisé' },
  icon:       { type: String, default: 'Bot' },
  color:      { type: String, default: 'from-emerald-500 to-teal-600' },
  isActive:   { type: Boolean, default: true },
  isPopular:  { type: Boolean, default: false },
  order:      { type: Number, default: 0 },
}, { timestamps: true });

DerivBotSchema.index({ slug: 1, isActive: 1 });

module.exports = mongoose.model('DerivBot', DerivBotSchema);
