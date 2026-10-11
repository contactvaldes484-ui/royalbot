const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  bot: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  slug: { type: String },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  vendorRevenue: { type: Number, default: 0 },
  platformCommission: { type: Number, default: 0 },
});

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: [orderItemSchema],
  totalAmount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },

  // Payment
  paymentMethod: { type: String, enum: ['usdt_trc20', 'binance_pay', 'mobile_money'], required: true },
  paymentStatus: { type: String, enum: ['pending', 'confirmed', 'rejected', 'expired'], default: 'pending' },
  transactionHash: { type: String, default: '' },
  binanceOrderId: { type: String, default: '' },
  paymentProof: { type: String, default: '' }, // base64 screenshot if needed

  // Mobile Money (SebPay)
  mobileMoneyProvider: { type: String, default: '' },
  mobileMoneyNumber: { type: String, default: '' },
  sebpayTransactionId: { type: String, default: '' },

  // Admin
  confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  confirmedAt: { type: Date },
  rejectionReason: { type: String, default: '' },
  adminNotes: { type: String, default: '' },

  // Expiry for pending orders (24h)
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
}, { timestamps: true });

// Auto-expire pending orders
orderSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { paymentStatus: 'pending' } });

module.exports = mongoose.model('Order', orderSchema);
