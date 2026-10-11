const mongoose = require('mongoose');

const profitScreenshotSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  imageData: { type: String, required: true }, // base64 data URL
  profit: { type: String }, // e.g. "+$1,250"
  trader: { type: String }, // e.g. "Jean D."
  platform: { type: String, enum: ['mt4', 'mt5', 'other'], default: 'mt5' },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('ProfitScreenshot', profitScreenshotSchema);
