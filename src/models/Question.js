import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['behavioral', 'technical', 'coding', 'system-design', 'hr'],
      required: true,
      index: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
      index: true,
    },
    category: { type: String, default: 'general' },
    tags: [{ type: String, lowercase: true }],
    roles: [{ type: String, lowercase: true }], // e.g. ['frontend', 'fullstack']
    companies: [{ type: String, lowercase: true }], // e.g. ['google', 'amazon']
    sampleAnswer: { type: String, default: '' },
    starterCode: { type: String, default: '' }, // for coding questions
    language: { type: String, default: 'javascript' },
    expectedKeywords: [String],
    followUpQuestions: [String],
    timeLimitSeconds: { type: Number, default: 120 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

questionSchema.index({ type: 1, difficulty: 1 });
questionSchema.index({ tags: 1 });

const Question = mongoose.model('Question', questionSchema);
export default Question;
