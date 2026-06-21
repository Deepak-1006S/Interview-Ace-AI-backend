import Question from '../models/Question.js';
import { success, paginated } from '../utils/response.js';

// GET /api/v1/coding - Get coding challenges
export const getChallenges = async (req, res, next) => {
  try {
    const { difficulty = 'all', search = '', page = 1, limit = 20 } = req.query;

    const filter = { type: 'coding', isActive: true };
    if (difficulty !== 'all') {
      filter.difficulty = difficulty;
    }
    if (search) {
      filter.$text = { $search: search };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [challenges, total] = await Promise.all([
      Question.find(filter)
        .select('_id text difficulty tags roles companies')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Question.countDocuments(filter),
    ]);

    const formatted = challenges.map((c) => ({
      _id: c._id,
      title: c.text.substring(0, 100),
      difficulty: c.difficulty,
      tags: c.tags || [],
      roles: c.roles || [],
      companies: c.companies || [],
    }));

    return res.status(200).json({
      success: true,
      data: { challenges: formatted },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
        hasMore: parseInt(page) * parseInt(limit) < total,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/coding/:id - Get single challenge
export const getChallenge = async (req, res, next) => {
  try {
    const challenge = await Question.findOne({
      _id: req.params.id,
      type: 'coding',
      isActive: true,
    }).lean();

    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found' });
    }

    return success(res, { challenge });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/coding/submit - Submit solution
export const submitSolution = async (req, res, next) => {
  try {
    const { challengeId, code, language, timeSpent } = req.body;

    const challenge = await Question.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found' });
    }

    // In a real application, this would evaluate the code
    // For now, return placeholder feedback
    const feedback = {
      accepted: true,
      score: 75,
      testsPassed: 3,
      totalTests: 4,
      feedback: 'Good solution! Consider optimizing space complexity.',
    };

    return success(res, feedback, 'Solution submitted');
  } catch (err) {
    next(err);
  }
};
