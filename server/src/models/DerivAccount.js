const mongoose = require('mongoose');
const vault = require('../lib/cryptoVault');

const DerivAccountSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  label:    { type: String, default: 'Mon compte Deriv' },
  loginId:  { type: String, required: true, trim: true },
  currency: { type: String, default: 'USD' },
  isDemo:   { type: Boolean, default: false },
  balance:  { type: Number, default: 0 },

  // Token chiffré AES-256-GCM
  tokenEnc:  { type: String, required: true, select: false },
  tokenMask: { type: String, default: '' },

  // Période d'essai de 7 jours offerte à chaque utilisateur
  trialStartDate: { type: Date, default: Date.now },
  trialExpiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 jours
  },
  trialUsed:      { type: Boolean, default: true },

  // Affiliation sous le lien du parrain
  affiliateVerified:  { type: Boolean, default: false },
  affiliateCheckedAt: { type: Date, default: null },

  status:     { type: String, enum: ['active', 'trial_expired', 'error', 'disabled'], default: 'active' },
  lastError:  { type: String, default: '' },
  lastCheck:  { type: Date, default: null },
  connectedAt:{ type: Date, default: Date.now },
}, { timestamps: true });

DerivAccountSchema.index({ user: 1, loginId: 1 });

DerivAccountSchema.methods.setToken = function (token) {
  this.tokenEnc  = vault.encrypt(token);
  const t = String(token);
  this.tokenMask = t.length > 6 ? `${t.slice(0, 3)}••••••${t.slice(-3)}` : '••••';
};

DerivAccountSchema.methods.getToken = function () {
  return vault.decrypt(this.tokenEnc);
};

// Vérifie si l'essai gratuit de 7 jours est toujours en cours
DerivAccountSchema.methods.isTrialValid = function () {
  if (!this.trialExpiresAt) return false;
  return new Date() < new Date(this.trialExpiresAt);
};

// Renvoie les jours restants d'essai
DerivAccountSchema.methods.getTrialDaysRemaining = function () {
  if (!this.trialExpiresAt) return 0;
  const diff = new Date(this.trialExpiresAt) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

module.exports = mongoose.model('DerivAccount', DerivAccountSchema);
