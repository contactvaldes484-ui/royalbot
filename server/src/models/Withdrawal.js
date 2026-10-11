const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  source: { type: String, enum: ['user', 'vendor'], default: 'user', index: true },
  amount: { type: Number, required: true },
  commission: { type: Number, default: 0 },
  commissionRate: { type: Number, default: 0 },
  netAmount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  method: { type: String, enum: ['crypto', 'mobile_money', 'bank'], required: true },
  walletAddress: { type: String },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'rejected'], default: 'pending' },
  processedAt: { type: Date },
  rejectionReason: { type: String },
  transactionHash: { type: String },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
