const mongoose = require('mongoose');

const PerformanceStatSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'RobotSession' },
  day:     { type: String, index: true }, // YYYY-MM-DD
  pnl:      { type: Number, default: 0 },
  roi:      { type: Number, default: 0 },
  trades:   { type: Number, default: 0 },
  wins:     { type: Number, default: 0 },
  losses:   { type: Number, default: 0 },
  volume:   { type: Number, default: 0 },
  drawdown: { type: Number, default: 0 },
  winRate:  { type: Number, default: 0 },
}, { timestamps: true });

PerformanceStatSchema.index({ user: 1, day: 1 });

module.exports = mongoose.model('PerformanceStat', PerformanceStatSchema);
