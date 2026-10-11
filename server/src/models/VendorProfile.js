const mongoose = require('mongoose');

const vendorProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  displayName: { type: String, required: true, trim: true },
  slug: { type: String, trim: true, unique: true, sparse: true },
  bio: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending', index: true },
  rejectionReason: { type: String, default: '' },
  payoutMethod: { type: String, enum: ['crypto', 'bank', 'other'], default: 'crypto' },
  payoutDetails: { type: Object, default: {} },
  totalRobots: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
}, {
  timestamps: true,
});

module.exports = mongoose.model('VendorProfile', vendorProfileSchema);
