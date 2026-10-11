const mongoose = require('mongoose');

const securityLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  email: { type: String, index: true },
  ip: { type: String, required: true, index: true },
  action: { 
    type: String, 
    enum: ['register', 'login', 'login_failed', 'ip_blocked', 'multi_account_blocked', 'multi_ip_blocked', 'suspicious'],
    required: true 
  },
  userAgent: { type: String, default: '' },
  details: { type: String, default: '' },
  blocked: { type: Boolean, default: false },
}, { timestamps: true });

// Compound indexes for fast lookups
securityLogSchema.index({ ip: 1, action: 1, createdAt: -1 });
securityLogSchema.index({ email: 1, ip: 1 });

module.exports = mongoose.model('SecurityLog', securityLogSchema);
