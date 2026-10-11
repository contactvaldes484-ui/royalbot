const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, minlength: 6 },
  authProvider: { type: String, enum: ['local'], default: 'local' },
  // RBAC role (5 levels)
  // user: standard customer
  // premium: granted higher access manually (deprecated, kept for compat)
  // vip: granted VIP access manually
  // admin: platform admin
  // super_admin: full access (cannot be demoted by other admins)
  role: { type: String, enum: ['user', 'premium', 'vip', 'admin', 'super_admin'], default: 'user', index: true },
  avatar: { type: String, default: '' },

  // Subscription (linked to SubscriptionPlan via slug)
  subscription: {
    plan: { type: String, default: 'free', index: true }, // slug: free|starter|pro|vip|institutional|...
    billingCycle: { type: String, enum: ['monthly', 'yearly', 'lifetime'], default: 'monthly' },
    startDate: { type: Date },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true },
    autoRenew: { type: Boolean, default: false },
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    // Usage counters (reset by cron)
    usage: {
      tradesToday: { type: Number, default: 0 },
      backtestsThisMonth: { type: Number, default: 0 },
      aiAnalysesToday: { type: Number, default: 0 },
      lastTradeReset: { type: Date, default: Date.now },
      lastBacktestReset: { type: Date, default: Date.now },
      lastAIReset: { type: Date, default: Date.now },
    },
  },
  
  // 2FA
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String },
  
  // Stats
  totalProfit: { type: Number, default: 0 },
  totalTrades: { type: Number, default: 0 },
  winRate: { type: Number, default: 0 },
  totalDeposits: { type: Number, default: 0 },
  totalWithdrawals: { type: Number, default: 0 },
  commissionOwed: { type: Number, default: 0 },

  // Copy Trading earnings (when user is a master)
  copyTradingEarnings: { type: Number, default: 0 },     // total commissions earned (lifetime)
  copyTradingAvailable: { type: Number, default: 0 },    // available for payout
  copyTradingPaidOut: { type: Number, default: 0 },      // already paid out
  
  vendor: {
    isVendor: { type: Boolean, default: false },
    profile: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorProfile' },
  },
  vendorEarnings: { type: Number, default: 0 },
  vendorAvailable: { type: Number, default: 0 },
  vendorPaidOut: { type: Number, default: 0 },

  // Notifications
  telegramChatId: { type: String },
  whatsappNumber: { type: String },
  notificationsEnabled: { type: Boolean, default: true },
  
  // Referral
  referralCode: { type: String, unique: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  referralEarnings: { type: Number, default: 0 },
  
  // Status
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpire: { type: Date },
  lastLogin: { type: Date },
  
  // Demo mode
  isDemoMode: { type: Boolean, default: false },
  demoBalance: { type: Number, default: 10000 },

  // Push notifications (PWA/mobile)
  pushSubscriptions: { type: Array, default: [] },

  // Purchased robots (marketplace)
  purchasedBots: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bot' }],

  // Security: IP binding (1 IP = 1 email)
  registrationIp: { type: String, default: '' },
  lastLoginIp: { type: String, default: '' },
  allowedIps: [{ type: String }],  // IPs that this user has used
  ipLocked: { type: Boolean, default: false },
  securityFlags: { type: Number, default: 0 },  // count of suspicious events
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toPublicJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.twoFactorSecret;
  delete obj.verificationToken;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpire;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
