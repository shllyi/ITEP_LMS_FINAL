const mongoose = require('mongoose');

const topicProgressSchema = new mongoose.Schema({
  topicId: { type: String, required: true },
  contentReviewed: { type: Boolean, default: false },
  quizPassed: { type: Boolean, default: false },
  bestScorePercent: { type: Number, default: 0 },
  lastScorePercent: { type: Number, default: 0 },
  attemptsCount: { type: Number, default: 0 },
  unlockedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  attempts: [{
    attemptNumber: { type: Number, required: true },
    scorePercent: { type: Number, required: true },
    correctCount: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    submittedAt: { type: Date, default: Date.now },
  }],
}, { _id: false });

const studentProgressSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  overallProgressPercent: { type: Number, default: 0 },
  topicProgress: [topicProgressSchema],
}, { timestamps: true });

studentProgressSchema.index({ student: 1, subject: 1 }, { unique: true });

module.exports = mongoose.model('StudentProgress', studentProgressSchema);
