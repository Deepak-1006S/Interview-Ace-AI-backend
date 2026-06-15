import Question from '../models/Question.js';
import { generateQuestions } from '../services/aiService.js';
import { success, created, paginated } from '../utils/response.js';

// GET /api/v1/questions
export const getQuestions = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const filter = { isActive: true };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.difficulty) filter.difficulty = req.query.difficulty;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.tag) filter.tags = req.query.tag;
    if (req.query.role) filter.roles = req.query.role.toLowerCase();

    const [questions, total] = await Promise.all([
      Question.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Question.countDocuments(filter),
    ]);

    return paginated(res, questions, page, limit, total);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/questions/:id
export const getQuestion = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id).lean();
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }
    return success(res, { question });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/questions/generate — AI question generation
export const generateAIQuestions = async (req, res, next) => {
  try {
    const { type, difficulty = 'medium', role, company, count = 5 } = req.body;

    const questions = await generateQuestions({ type, difficulty, role, company, count });

    // Optionally save to DB
    if (req.query.save === 'true') {
      await Question.insertMany(
        questions.map((q) => ({
          ...q,
          roles: role ? [role.toLowerCase()] : [],
          companies: company ? [company.toLowerCase()] : [],
        })),
        { ordered: false }
      );
    }

    return success(res, { questions }, 'Questions generated');
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/questions/random — Get random questions for practice
export const getRandomQuestions = async (req, res, next) => {
  try {
    const { type, difficulty, count = 5 } = req.query;

    const filter = { isActive: true };
    if (type) filter.type = type;
    if (difficulty) filter.difficulty = difficulty;

    const questions = await Question.aggregate([
      { $match: filter },
      { $sample: { size: parseInt(count) } },
    ]);

    return success(res, { questions });
  } catch (err) {
    next(err);
  }
};
