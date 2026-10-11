const mongoose = require('mongoose');
const vault = require('../lib/cryptoVault');

const BinanceAccountSchema = new mongoose.Schema({
  user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  label:  { type: String, default: 'Mon compte Binance' },
  market: { type: String, enum: ['spot', 'futures', 'both'], default: 'both' },

  // Clés chiffrées AES-256-GCM — JAMAIS renvoyées au front (select:false)
  apiKeyEnc:    { type: String, required: true, select: false },
  apiSecretEnc: { type: String, required: true, select: false },
  apiKeyMask:   { type: String, default: '' },

  isTestnet: { type: Boolean, default: false },

  permissions: {
    spot:     { type: Boolean, default: false },
    futures:  { type: Boolean, default: false },
    reading:  { type: Boolean, default: false },
    withdraw: { type: Boolean, default: false }, // doit rester false
  },

  balances:    [{ asset: String, free: Number, locked: Number }],
  spotUSDT:    { type: Number, default: 0 },
  futuresUSDT: { type: Number, default: 0 },

  status:      { type: String, enum: ['pending', 'active', 'error', 'disabled'], default: 'pending' },
  lastError:   { type: String, default: '' },
  lastCheck:   { type: Date, default: null },
  connectedAt: { type: Date, default: null },
}, { timestamps: true });

BinanceAccountSchema.index({ user: 1, label: 1 });

BinanceAccountSchema.methods.setKeys = function (apiKey, apiSecret) {
  this.apiKeyEnc    = vault.encrypt(apiKey);
  this.apiSecretEnc = vault.encrypt(apiSecret);
  const k = String(apiKey);
  this.apiKeyMask = k.length > 8 ? `${k.slice(0, 4)}••••••${k.slice(-4)}` : '••••';
};

BinanceAccountSchema.methods.getKeys = function () {
  return {
    apiKey:    vault.decrypt(this.apiKeyEnc),
    apiSecret: vault.decrypt(this.apiSecretEnc),
  };
};

module.exports = mongoose.model('BinanceAccount', BinanceAccountSchema);
