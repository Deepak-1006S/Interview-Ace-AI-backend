import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    questionText: String,
    questionType: {
      type: String,
      enum: ['behavioral', 'technical', 'coding', 'system-design', 'hr'],
    },
    userAnswer: { type: String, default: '' },
    codeAnswer: { type: String, default: '' }, // for coding questions
    language: { type: String, default: 'javascript' },
    aiFeedback: {
      score: { type: Number, min: 0, max: 100, default: null },
      strengths: [String],
      improvements: [String],
      detailedFeedback: { type: String, default: '' },
      sampleAnswer: { type: String, default: '' },
      keywords: [String],
      followUpQuestions: [String],
    },
    timeSpent: { type: Number, default: 0 }, // seconds
    skipped: { type: Boolean, default: false },
  },
  { _id: true }
);

const interviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, default: 'Mock Interview' },
    type: {
      type: String,
      enum: ['behavioral', 'technical', 'coding', 'system-design', 'mixed', 'hr'],
      required: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    targetRole: { type: String, default: '' },
    targetCompany: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'abandoned'],
      default: 'pending',
    },
    answers: [answerSchema],
    totalQuestions: { type: Number, default: 5 },
    currentQuestionIndex: { type: Number, default: 0 },
    overallScore: { type: Number, default: null },
    duration: { type: Number, default: 0 }, // seconds
    startedAt: Date,
    completedAt: Date,
    summary: {
      strengths: [String],
      areasForImprovement: [String],
      overallFeedback: String,
      recommendedTopics: [String],
    },
  },
  { timestamps: true }
);

// Index for efficient queries
interviewSchema.index({ user: 1, createdAt: -1 });
interviewSchema.index({ user: 1, status: 1 });

const Interview = mongoose.model('Interview', interviewSchema);
export default Interview;
