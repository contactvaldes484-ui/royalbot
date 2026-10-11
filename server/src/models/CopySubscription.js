const mongoose = require('mongoose');

/**
 * CopySubscription — a follower's subscription to a master.
 *
 * Lot sizing modes:
 *   - 'proportional' → lot scales with follower equity / master equity (default, fair)
 *   - 'fixed'        → always the same fixed lot per copied trade
 *   - 'multiplier'   → master_lot * multiplier
 *
 * Status: active → paused (manual or AI-triggered) → stopped (terminal)
 */
const CopySubscriptionSchema = new mongoose.Schema({
  follower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  master:   { type: mongoose.Schema.Types.ObjectId, ref: 'MasterAccount', required: true, index: true },

  // Target Binance account where copied trades execute
  followerBinanceAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'BinanceAccount', required: true },

  // Status
  status: { type: String, enum: ['active', 'paused', 'stopped'], default: 'active', index: true },
  pausedBy: { type: String, enum: ['user', 'ai', 'admin', null], default: null },
  pauseReason: { type: String, default: '' },
  pausedAt: { type: Date },
  stoppedAt: { type: Date },

  // ─── Copy settings ──────────────────────────────────────────────────────
  settings: {
    // lotMode réinterprété en quantité crypto (Binance) :
    //   proportional → qty master × (equity follower / equity master)
    //   fixed        → quantité fixe par trade copié
    //   multiplier   → qty master × multiplier
    lotMode: { type: String, enum: ['proportional', 'fixed', 'multiplier'], default: 'proportional' },
    fixedLot: { type: Number, default: 0.01, min: 0, max: 100000 },     // quantité crypto fixe
    multiplier: { type: Number, default: 1.0, min: 0.01, max: 10 },
    maxLotPerTrade: { type: Number, default: 0, min: 0, max: 100000 },  // 0 = pas de plafond de quantité

    copySL: { type: Boolean, default: true },
    copyTP: { type: Boolean, default: true },
    reverseDirection: { type: Boolean, default: false },   // opposite trades (advanced/contrarian)

    // Symbol filter (empty = all)
    allowedSymbols: [{ type: String }],

    // Risk caps
    maxAllocation: { type: Number, default: 1000 },        // USD: max capital allocated to this master
    maxRiskPct: { type: Number, default: 5 },              // % equity at risk per copied trade
    maxDrawdownPct: { type: Number, default: 20 },         // auto-stop if subscription DD exceeds
    globalSL: { type: Number, default: 0 },                // USD loss → stop copying (0 = disabled)
    globalTP: { type: Number, default: 0 },                // USD profit → stop copying

    // AI guard
    aiGuardEnabled: { type: Boolean, default: true },
    aiPauseOnMasterDanger: { type: Boolean, default: true },
  },

  // ─── Live performance ───────────────────────────────────────────────────
  stats: {
    copiedTrades: { type: Number, default: 0 },
    openTrades:   { type: Number, default: 0 },
    wins:         { type: Number, default: 0 },
    losses:       { type: Number, default: 0 },
    totalProfit:  { type: Number, default: 0 },
    totalLoss:    { type: Number, default: 0 },
    netPnl:       { type: Number, default: 0 },
    maxDrawdown:  { type: Number, default: 0 },
    feesPaid:     { type: Number, default: 0 },           // master performance fees
    startEquity:  { type: Number, default: 0 },
    peakEquity:   { type: Number, default: 0 },
    lastCopyAt:   { type: Date },
  },
}, { timestamps: true });

// Prevent duplicate active subscription to the same master on same account
CopySubscriptionSchema.index(
  { follower: 1, master: 1, followerBinanceAccount: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: 'stopped' } } }
);

module.exports = mongoose.model('CopySubscription', CopySubscriptionSchema);
