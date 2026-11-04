const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    enum: ['multiple_choice'],
    default: 'multiple_choice',
  },
  prompt: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: String, required: true },
  explanation: { type: String, default: '' },
  points: { type: Number, default: 1 },
}, { _id: false });

const quizSchema = new mongoose.Schema({
  title: { type: String, default: 'Topic Assessment' },
  hasTimer: { type: Boolean, default: true },
  durationMinutes: {
    type: Number,
    min: [10, 'Quiz duration must be at least 10 minutes.'],
    max: [20, 'Quiz duration cannot exceed 20 minutes.'],
    default: 15,
  },
  passingScorePercent: {
    type: Number,
    min: [1, 'Passing score must be at least 1%'],
    max: [100, 'Passing score cannot exceed 100%'],
    default: 75,
  },
  shuffleQuestions: { type: Boolean, default: true },
  shuffleOptions: { type: Boolean, default: true },
  questions: [questionSchema],
}, { _id: false });

const topicContentSchema = new mongoose.Schema({
  richText: { type: String, default: '' },
  presentationS3Key: { type: String, default: '' },
  presentationUrl: { type: String, default: '' },
  presentationFileName: { type: String, default: '' },
  presentationFileSize: { type: Number, default: 0 },
  presentationExtractedText: { type: String, default: '' },
  summaryText: { type: String, default: '' },
  summaryBullets: [{ type: String }],
}, { _id: false });

const topicSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  order: { type: Number, default: 1 },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  content: { type: topicContentSchema, default: () => ({}) },
  quiz: { type: quizSchema, default: () => ({ hasTimer: true, durationMinutes: 15, passingScorePercent: 75, shuffleQuestions: true, shuffleOptions: true, questions: [] }) },
}, { _id: false });

const moduleSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  order: { type: Number, default: 1 },
  topics: [topicSchema],
}, { _id: false });

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Subject name is required'],
    trim: true,
  },
  code: {
    type: String,
    required: [true, 'Course code is required'],
    trim: true,
    uppercase: true,
  },
  academicYear: {
    type: String,
    required: [true, 'Academic year is required'],
    trim: true,
    default: '2026-2027',
  },
  semester: {
    type: String,
    required: [true, 'Semester is required'],
    enum: ['1st Semester', '2nd Semester', '3rd Semester'],
    default: '1st Semester',
  },
  yearLevel: {
    type: String,
    required: [true, 'Year level is required'],
    enum: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
    default: '1st Year',
  },
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  enrolledStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  modules: [moduleSchema],
}, { timestamps: true });

module.exports = mongoose.model('Subject', subjectSchema);
