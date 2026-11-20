const mongoose = require('mongoose');

const AdminWithdrawalSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  grossAmount: { type: Number, required: true, min: 0.01 },
  feePercent: { type: Number, default: 6 },
  feeAmount: { type: Number, required: true, min: 0 },
  netAmount: { type: Number, required: true, min: 0.01 },
  currency: { type: String, default: 'XOF' },
  country: { type: String, default: 'CI' },
  phoneNumber: { type: String, required: true },
  operator: { type: String, required: true },
  externalReference: { type: String, required: true, unique: true },
  providerReference: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  errorMessage: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('AdminWithdrawal', AdminWithdrawalSchema);
