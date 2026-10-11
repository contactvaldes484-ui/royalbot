const mongoose = require('mongoose');

const robotReviewSchema = new mongoose.Schema({
  robot: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  title: { type: String, default: '' },
  comment: { type: String, default: '' },
  abuseReported: { type: Boolean, default: false },
  abuseReason: { type: String, default: '' },
  status: { type: String, enum: ['visible', 'hidden'], default: 'visible', index: true },
}, {
  timestamps: true,
});

robotReviewSchema.index({ robot: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('RobotReview', robotReviewSchema);
