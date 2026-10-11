const mongoose = require('mongoose');

const groupMessageSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, maxlength: 2000 },
  type: { type: String, enum: ['text', 'image', 'signal', 'system'], default: 'text' },

  // For signal messages
  signal: {
    symbol: String,
    direction: { type: String, enum: ['buy', 'sell', 'over', 'under', 'even', 'odd'] },
    entry: Number,
    stopLoss: Number,
    takeProfit: Number,
    notes: String,
  },

  // Reactions
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: String,
  }],

  // Metadata
  isEdited: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'GroupMessage' },

  // Auto-delete
  expiresAt: { type: Date },
}, {
  timestamps: true
});

// TTL index — MongoDB will auto-delete documents when expiresAt is reached
groupMessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
groupMessageSchema.index({ group: 1, createdAt: -1 });
groupMessageSchema.index({ sender: 1 });
groupMessageSchema.index({ isPinned: 1, group: 1 });

module.exports = mongoose.model('GroupMessage', groupMessageSchema);
