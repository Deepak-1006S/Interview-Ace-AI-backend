import { evaluateAnswer, generateFollowUp } from '../services/aiService.js';
import { success } from '../utils/response.js';

// POST /api/v1/feedback/evaluate
export const evaluateSingle = async (req, res, next) => {
  try {
    const { question, answer, codeAnswer, type, role } = req.body;

    if (!question || (!answer && !codeAnswer)) {
      return res.status(400).json({
        success: false,
        message: 'Question and answer are required.',
      });
    }

    const feedback = await evaluateAnswer({ question, answer, codeAnswer, type, role });
    return success(res, { feedback }, 'Feedback generated');
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/feedback/follow-up
export const getFollowUp = async (req, res, next) => {
  try {
    const { question, answer, context } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ success: false, message: 'Question and answer are required.' });
    }

    const followUpQuestion = await generateFollowUp({ question, answer, context });
    return success(res, { followUpQuestion });
  } catch (err) {
    next(err);
  }
};
