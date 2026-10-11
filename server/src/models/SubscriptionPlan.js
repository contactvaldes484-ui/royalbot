const mongoose = require('mongoose');

/**
 * SubscriptionPlan — DB-driven plan catalog.
 * Admins can create/update/delete plans without code changes.
 */
const subscriptionPlanSchema = new mongoose.Schema({
  // Identification
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  name: { type: String, required: true, trim: true },
  tagline: { type: String, default: '' },
  description: { type: String, default: '' },

  // Tier hierarchy (used by middleware to compare access level)
  // 0 = free, higher = more access. Reserved tiers: 0,1,2,3,4 for default plans.
  tier: { type: Number, required: true, default: 0, index: true },

  // Pricing (USD)
  priceMonthly: { type: Number, default: 0, min: 0 },
  priceYearly: { type: Number, default: 0, min: 0 }, // discounted full-year price
  currency: { type: String, default: 'USD' },

  // Category & Platform separation
  category: { type: String, enum: ['crypto', 'deriv'], default: 'crypto', index: true },
  broker: { type: String, enum: ['binance_bybit', 'deriv'], default: 'binance_bybit' },
  referralEligible: { type: Boolean, default: true }, // Can be unlocked for free via referral
  referralUnlockNote: { type: String, default: 'Ou gratuit à vie en vous inscrivant avec notre lien partenaire' },
  allowPaidSubscription: { type: Boolean, default: true }, // Can be purchased via monthly paid subscription
  activationNotice: { type: String, default: '' }, // Admin notice shown if activation is paused

  // Limits (null = unlimited)
  limits: {
    maxRobots: { type: Number, default: 0 },           // 0 = none, -1 = unlimited
    maxBinanceAccounts: { type: Number, default: 0 },  // comptes Binance connectables
    maxTradesPerDay: { type: Number, default: 0 },     // -1 = unlimited
    maxBacktestsPerMonth: { type: Number, default: 0 },
  },

  // Feature flags (for requireFeature middleware)
  features: {
    aiAccess: { type: Boolean, default: false },
    aiAdvanced: { type: Boolean, default: false },
    signalsBasic: { type: Boolean, default: false },
    signalsPremium: { type: Boolean, default: false },
    copyTrading: { type: Boolean, default: false },
    backtesting: { type: Boolean, default: false },
    marketplaceAccess: { type: Boolean, default: false },
    multiAccount: { type: Boolean, default: false },
    apiAccess: { type: Boolean, default: false },
    prioritySupport: { type: Boolean, default: false },
    dedicatedManager: { type: Boolean, default: false },
    whiteLabel: { type: Boolean, default: false },
  },

  // Display
  highlights: [{ type: String }],         // bullet points shown on pricing card
  badge: { type: String, default: '' },   // e.g. "Le plus populaire"
  color: { type: String, default: '' },   // tailwind gradient suffix
  icon: { type: String, default: '' },    // lucide-react icon name
  popular: { type: Boolean, default: false },
  order: { type: Number, default: 0 },

  // Trial
  trialDays: { type: Number, default: 0 },

  // Status
  isActive: { type: Boolean, default: true },
  isPublic: { type: Boolean, default: true },  // hidden plans (e.g. enterprise) won't show on Pricing
}, {
  timestamps: true
});

subscriptionPlanSchema.index({ tier: 1, order: 1 });

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
