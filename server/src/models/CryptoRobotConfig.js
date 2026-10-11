const mongoose = require('mongoose');

const CryptoRobotConfigSchema = new mongoose.Schema({
  key:           { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  name:          { type: String, required: true, trim: true },
  tier:          { type: String, enum: ['free', 'starter', 'pro', 'vip', 'institutional'], default: 'free', index: true },
  badge:         { type: String, default: 'Algorithmique' },
  strategyTitle: { type: String, default: 'Stratégie Institutionnelle' },

  markets:       [{ type: String, enum: ['spot', 'futures'], default: ['spot', 'futures'] }],
  symbols:       [{ type: String }],
  timeframe:     { type: String, default: '5m' },
  pollInterval:  { type: Number, default: 10000 }, // millisecondes
  minCapital:    { type: Number, default: 10 },
  winRate:       { type: String, default: '78-84%' },

  // Mode de définition de la stratégie
  // 'builtin' : stratégie native optimisée par nos experts
  // 'prompt_nl' : stratégie rédigée en langage naturel par l'administrateur
  // 'rule_based' : règles conditionnelles structurées
  // 'custom_code' : code JavaScript de signal personnalisé
  strategyMode: {
    type: String,
    enum: ['builtin', 'prompt_nl', 'rule_based', 'custom_code'],
    default: 'builtin',
  },

  // Description / Explication en langage naturel rédigée par l'administrateur
  promptDescription: { type: String, default: '' },

  // Règles structurées (indicateurs, opérateurs, seuils)
  rules: {
    buyConditions:  [{ type: mongoose.Schema.Types.Mixed }],
    sellConditions: [{ type: mongoose.Schema.Types.Mixed }],
    slRule:         { type: String, default: 'atr_1.5' },
    tpRule:         { type: String, default: 'atr_3.0' },
  },

  // Code compilé ou code personnalisé exécutable
  customCode: { type: String, default: '' },

  // Paramètres d'indicateurs personnalisables
  indicatorsConfig: {
    emaFast:     { type: Number, default: 9 },
    emaSlow:     { type: Number, default: 21 },
    emaTrend:    { type: Number, default: 200 },
    rsiPeriod:   { type: Number, default: 14 },
    rsiOverbought: { type: Number, default: 70 },
    rsiOversold:   { type: Number, default: 30 },
    bbPeriod:    { type: Number, default: 20 },
    bbStdDev:    { type: Number, default: 2 },
    atrPeriod:   { type: Number, default: 14 },
    stochK:      { type: Number, default: 14 },
    stochD:      { type: Number, default: 3 },
  },

  // Gestion du risque et ratios
  risk: {
    slAtrMultiplier:   { type: Number, default: 1.5 },
    tpAtrMultiplier:   { type: Number, default: 3.0 },
    minRiskReward:     { type: Number, default: 2.0 },
    maxOpenTrades:     { type: Number, default: 2 },
    defaultLeverage:   { type: Number, default: 5 },
  },

  // Statut
  isActive:  { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
  order:     { type: Number, default: 0 },
}, { timestamps: true });

CryptoRobotConfigSchema.index({ key: 1, isActive: 1 });

module.exports = mongoose.model('CryptoRobotConfig', CryptoRobotConfigSchema);
