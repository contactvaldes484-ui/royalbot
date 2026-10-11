const mongoose = require('mongoose');

/**
 * CopyTrade — log of a single trade copied from master → follower.
 *
 * One master trade → many CopyTrade rows (one per active follower subscription).
 */
const CopyTradeSchema = new mongoose.Schema({
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'CopySubscription', required: true, index: true },
  master:       { type: mongoose.Schema.Types.ObjectId, ref: 'MasterAccount',     required: true, index: true },
  follower:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',              required: true, index: true },

  // Master trade reference
  masterTicket: { type: String, required: true, index: true },
  masterLot:    { type: Number, required: true },
  masterOpenPrice: { type: Number },

  // Follower trade execution
  followerTicket: { type: String, default: '' },
  followerLot:    { type: Number, required: true },
  followerOpenPrice: { type: Number },
  followerClosePrice: { type: Number },

  // Common trade fields
  symbol: { type: String, required: true },
  market: { type: String, enum: ['spot', 'futures'], default: 'spot' },
  type:   { type: String, enum: ['buy', 'sell'], required: true },
  sl: { type: Number },
  tp: { type: Number },

  openTime:  { type: Date, default: Date.now },
  closeTime: { type: Date },

  status: { type: String, enum: ['open', 'closed', 'failed', 'skipped'], default: 'open', index: true },
  errorMessage: { type: String, default: '' },
  skipReason:   { type: String, default: '' },     // 'symbol_filter', 'lot_too_small', 'max_allocation', ...

  profit: { type: Number, default: 0 },
  fee:    { type: Number, default: 0 },            // master performance fee on profit

  comment: { type: String, default: '' },
}, { timestamps: true });

CopyTradeSchema.index({ subscription: 1, openTime: -1 });

module.exports = mongoose.model('CopyTrade', CopyTradeSchema);
