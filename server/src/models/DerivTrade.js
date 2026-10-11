const mongoose = require('mongoose');

const DerivTradeSchema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  session:      { type: mongoose.Schema.Types.ObjectId, ref: 'DerivSession', default: null },
  derivAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'DerivAccount', required: true },

  isManual:     { type: Boolean, default: false }, // true = SmartTrader manuel, false = Robot automatique

  contractId:   { type: String, required: true, index: true },
  transactionId:{ type: String, default: '' },

  symbol:       { type: String, required: true },
  contractType: { type: String, required: true },
  barrier:      { type: String, default: '' },

  stake:        { type: Number, required: true },
  payout:       { type: Number, default: 0 },
  profit:       { type: Number, default: 0 },

  entryTick:    { type: Number, default: null },
  exitTick:     { type: Number, default: null },

  status:       { type: String, enum: ['open', 'won', 'lost'], default: 'open', index: true },
  openedAt:     { type: Date, default: Date.now },
  closedAt:     { type: Date, default: null },
}, { timestamps: true });

DerivTradeSchema.index({ user: 1, openedAt: -1 });

module.exports = mongoose.model('DerivTrade', DerivTradeSchema);
