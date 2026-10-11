const mongoose = require('mongoose');
const vault = require('../lib/cryptoVault');

const BybitAccountSchema = new mongoose.Schema({
  user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  label:  { type: String, default: 'Mon compte Bybit' },
  category: { type: String, enum: ['unified', 'spot', 'linear'], default: 'unified' },

  // Clés chiffrées AES-256-GCM — JAMAIS renvoyées au front (select:false)
  apiKeyEnc:    { type: String, required: true, select: false },
  apiSecretEnc: { type: String, required: true, select: false },
  apiKeyMask:   { type: String, default: '' },

  bybitUid:     { type: String, default: '', index: true },
  isTestnet:    { type: Boolean, default: false },

  permissions: {
    spot:     { type: Boolean, default: false },
    linear:   { type: Boolean, default: false }, // Futures / Derivatives / Forex
    reading:  { type: Boolean, default: false },
    withdraw: { type: Boolean, default: false }, // doit rester false
  },

  spotUSDT:    { type: Number, default: 0 },
  futuresUSDT: { type: Number, default: 0 },

  // Vérification de parrainage / affiliation
  affiliateVerified:  { type: Boolean, default: false },
  affiliateCheckedAt: { type: Date, default: null },

  status:      { type: String, enum: ['pending', 'active', 'error', 'disabled'], default: 'pending' },
  lastError:   { type: String, default: '' },
  lastCheck:   { type: Date, default: null },
  connectedAt: { type: Date, default: null },
}, { timestamps: true });

BybitAccountSchema.index({ user: 1, label: 1 });

BybitAccountSchema.methods.setKeys = function (apiKey, apiSecret) {
  this.apiKeyEnc    = vault.encrypt(apiKey);
  this.apiSecretEnc = vault.encrypt(apiSecret);
  const k = String(apiKey);
  this.apiKeyMask = k.length > 8 ? `${k.slice(0, 4)}••••••${k.slice(-4)}` : '••••';
};

BybitAccountSchema.methods.getKeys = function () {
  return {
    apiKey:    vault.decrypt(this.apiKeyEnc),
    apiSecret: vault.decrypt(this.apiSecretEnc),
  };
};

module.exports = mongoose.model('BybitAccount', BybitAccountSchema);
