const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  // Plan (slug — references SubscriptionPlan.slug, not enum-restricted to allow custom plans)
  plan: { type: String, required: true, index: true },
  billingCycle: { type: String, enum: ['monthly', 'yearly', 'lifetime'], default: 'monthly' },

  // Payment
  amount: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'usdt_tron', 'binance_pay', 'crypto', 'mobile_money', 'card', 'manual', 'admin_grant'],
    default: 'manual'
  },
  paymentId: { type: String },
  paymentStatus: { type: String, enum: ['pending', 'confirmed', 'failed', 'refunded'], default: 'pending', index: true },

  // Crypto details
  cryptoTxHash: { type: String },
  cryptoWallet: { type: String },
  cryptoAmount: { type: Number },
  cryptoCurrency: { type: String },

  // Mobile Money details
  mobileMoneyProvider: { type: String }, // orange, mtn, moov, wave...
  mobileMoneyNumber: { type: String },
  mobileMoneyTxRef: { type: String },

  // Proof of payment (uploaded screenshot)
  proofImage: { type: String }, // base64 or URL

  // Admin grant
  grantedByAdmin: { type: Boolean, default: false },
  grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  adminNote: { type: String },

  // Duration
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, index: true },
  isActive: { type: Boolean, default: false, index: true },
  autoRenew: { type: Boolean, default: false },

  // Stripe (kept for future)
  stripeSubscriptionId: { type: String },
  stripeCustomerId: { type: String },
  stripeInvoiceId: { type: String },

  // Lifecycle
  cancelledAt: { type: Date },
  cancelReason: { type: String },
  expiredAt: { type: Date },
  renewedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },

  // Anti-fraud / audit
  ip: { type: String },
  userAgent: { type: String },
}, {
  timestamps: true
});

// Compound indexes for fast queries
subscriptionSchema.index({ user: 1, isActive: 1 });
subscriptionSchema.index({ paymentStatus: 1, createdAt: -1 });
subscriptionSchema.index({ endDate: 1, isActive: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
