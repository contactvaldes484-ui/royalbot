const mongoose = require('mongoose');

const RobotLogSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'RobotSession', index: true },
  level:   { type: String, enum: ['info', 'warn', 'error'], default: 'info' },
  event:   { type: String }, // signal | open | close | risk_block | binance_error | tick_error
  message: { type: String },
  meta:    { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now, expires: '30d', index: true },
});

module.exports = mongoose.model('RobotLog', RobotLogSchema);
