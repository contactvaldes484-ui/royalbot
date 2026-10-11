const mongoose = require('mongoose');

/**
 * CommissionLedger — immutable log of every commission credit & payout for masters.
 *
 * Types:
 *   - 'earn'   → master earned commission from a profitable copied trade
 *   - 'payout' → master requested/received payout (admin processed)
 *   - 'adjust' → admin manual adjustment (refund, correction)
 */
const CommissionLedgerSchema = new mongoose.Schema({
  master:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  masterAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterAccount', index: true },

  type: { type: String, enum: ['earn', 'payout', 'adjust'], required: true, index: true },
  amount: { type: Number, required: true },             // positive = credit, negative = debit (payout)

  // Source references
  copyTrade:    { type: mongoose.Schema.Types.ObjectId, ref: 'CopyTrade' },
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'CopySubscription' },
  follower:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Trade context (denormalized for fast UI rendering)
  symbol: { type: String },
  feePct: { type: Number },
  tradeProfit: { type: Number },

  // Payout details — all payouts are processed manually by admin
  // (the platform does NOT control broker withdrawals — masters are paid externally)
  payoutMethod: { type: String, enum: ['crypto', 'bank_transfer', 'paypal', 'other', null], default: null },
  payoutStatus: { type: String, enum: ['pending', 'processing', 'completed', 'rejected', null], default: null },
  payoutAddress: { type: String, default: '' },         // wallet address / IBAN / email
  payoutTxRef: { type: String, default: '' },           // tx hash / bank reference
  payoutNotes: { type: String, default: '' },           // master's notes (network, currency)

  description: { type: String, default: '' },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },  // admin who processed
}, { timestamps: true });

CommissionLedgerSchema.index({ master: 1, createdAt: -1 });

module.exports = mongoose.model('CommissionLedger', CommissionLedgerSchema);
