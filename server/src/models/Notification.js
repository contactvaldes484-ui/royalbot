const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  type:     { type: String },
  title:    { type: String },
  body:     { type: String },
  channels: [{ type: String }], // inapp | email | telegram
  read:     { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model('Notification', NotificationSchema);
