const mongoose = require('mongoose');

const PositionSchema = new mongoose.Schema({
  user:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  session:        { type: mongoose.Schema.Types.ObjectId, ref: 'RobotSession', index: true },
  binanceAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'BinanceAccount' },

  symbol:        { type: String },
  positionSide:  { type: String, enum: ['LONG', 'SHORT', 'BOTH'], default: 'BOTH' },
  qty:           { type: Number },
  entryPrice:    { type: Number },
  leverage:      { type: Number, default: 1 },
  liquidationPrice: { type: Number },
  unrealizedPnl: { type: Number, default: 0 },
  sl:            { type: Number },
  tp:            { type: Number },
  slOrderId:     { type: String },
  tpOrderId:     { type: String },
  trade:         { type: mongoose.Schema.Types.ObjectId, ref: 'BinanceTrade' },

  status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },
}, { timestamps: true });

module.exports = mongoose.model('Position', PositionSchema);
