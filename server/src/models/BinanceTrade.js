const mongoose = require('mongoose');

const BinanceTradeSchema = new mongoose.Schema({
  user:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  exchange:       { type: String, enum: ['binance', 'bybit'], default: 'binance', index: true },
  session:        { type: mongoose.Schema.Types.ObjectId, ref: 'RobotSession', index: true },
  binanceAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'BinanceAccount', index: true },
  bybitAccount:   { type: mongoose.Schema.Types.ObjectId, ref: 'BybitAccount', index: true },
  robotKey:       { type: String, index: true },

  market:       { type: String, enum: ['spot', 'futures'], required: true },
  symbol:       { type: String, required: true, index: true },
  side:         { type: String, enum: ['BUY', 'SELL'], required: true },
  positionSide: { type: String, enum: ['LONG', 'SHORT', 'BOTH'], default: 'BOTH' },
  type:         { type: String, enum: ['MARKET', 'LIMIT'], default: 'MARKET' },

  qty:        { type: Number, required: true },
  entryPrice: { type: Number },
  exitPrice:  { type: Number },
  sl:         { type: Number },
  tp:         { type: Number },
  leverage:   { type: Number, default: 1 },

  pnl:        { type: Number, default: 0 },
  pnlPct:     { type: Number, default: 0 },
  commission: { type: Number, default: 0 },

  binanceOrderId:  { type: String, index: true },
  binanceClientId: { type: String },
  slOrderId:       { type: String },
  tpOrderId:       { type: String },

  status:      { type: String, enum: ['open', 'closed', 'canceled', 'error'], default: 'open', index: true },
  reason:      { type: String },
  closeReason: { type: String }, // tp | sl | signal | manual | liquidation

  openedAt: { type: Date, default: Date.now, index: true },
  closedAt: { type: Date },
}, { timestamps: true });

BinanceTradeSchema.index({ user: 1, status: 1, openedAt: -1 });
BinanceTradeSchema.index({ session: 1, status: 1 });

module.exports = mongoose.model('BinanceTrade', BinanceTradeSchema);
