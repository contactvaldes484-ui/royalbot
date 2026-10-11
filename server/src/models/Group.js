const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, default: '' },
  platform: { type: String, enum: ['mt4', 'mt5', 'forex', 'general'], required: true },
  type: { type: String, enum: ['private', 'public'], default: 'private' },
  icon: { type: String, default: '' },
  color: { type: String, default: '#8b5cf6' },

  // Admin & members
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  bannedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  maxMembers: { type: Number, default: 500 },

  // Settings
  autoDeleteMessages: { type: Boolean, default: true },
  autoDeleteHours: { type: Number, default: 24 },
  isActive: { type: Boolean, default: true },
  muteAll: { type: Boolean, default: false },
  rules: { type: String, default: '' },

  // Stats
  messageCount: { type: Number, default: 0 },
  lastMessageAt: { type: Date },
}, {
  timestamps: true
});

groupSchema.index({ platform: 1, isActive: 1 });
groupSchema.index({ slug: 1 });
groupSchema.index({ members: 1 });

module.exports = mongoose.model('Group', groupSchema);
