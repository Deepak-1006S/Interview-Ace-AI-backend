import Interview from '../models/Interview.js';
import Question from '../models/Question.js';
import User from '../models/User.js';
import { generateQuestions, evaluateAnswer, generateInterviewSummary } from '../services/aiService.js';
import { success, created, paginated } from '../utils/response.js';

// POST /api/v1/interviews — Create and start a new interview
export const createInterview = async (req, res, next) => {
  try {
    const { type, difficulty = 'medium', targetRole, targetCompany, questionCount = 5 } = req.body;
    const user = req.user;

    // Try to find questions from DB first; fall back to AI generation
    let questions = await Question.find({
      type,
      difficulty,
      isActive: true,
      ...(targetRole && { roles: { $in: [targetRole.toLowerCase()] } }),
    })
      .limit(questionCount)
      .lean();

    let questionsForInterview;

    if (questions.length >= questionCount) {
      // Shuffle and pick
      questions = questions.sort(() => Math.random() - 0.5).slice(0, questionCount);
      questionsForInterview = questions.map((q) => ({
        questionId: q._id,
        questionText: q.text,
        questionType: q.type,
        aiFeedback: {},
      }));
    } else {
      // Generate via AI
      const aiQuestions = await generateQuestions({
        type,
        difficulty,
        role: targetRole || user.targetRole,
        company: targetCompany || user.targetCompany,
        count: questionCount,
      });

      // Save generated questions for future use
      const savedQs = await Question.insertMany(
        aiQuestions.map((q) => ({
          ...q,
          roles: targetRole ? [targetRole.toLowerCase()] : [],
          companies: targetCompany ? [targetCompany.toLowerCase()] : [],
        }))
      );

      questionsForInterview = savedQs.map((q) => ({
        questionId: q._id,
        questionText: q.text,
        questionType: q.type,
        aiFeedback: {},
      }));
    }

    const interview = await Interview.create({
      user: user._id,
      title: `${targetRole || type} Interview - ${new Date().toLocaleDateString()}`,
      type,
      difficulty,
      targetRole: targetRole || user.targetRole,
      targetCompany: targetCompany || user.targetCompany,
      answers: questionsForInterview,
      totalQuestions: questionsForInterview.length,
      status: 'active',
      startedAt: new Date(),
    });

    return created(res, { interview }, 'Interview started');
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/interviews — List user's interviews
export const getInterviews = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;
    const { status, type } = req.query;

    const filter = { user: req.user._id };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const [interviews, total] = await Promise.all([
      Interview.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-answers.aiFeedback.sampleAnswer') // lightweight list
        .lean(),
      Interview.countDocuments(filter),
    ]);

    return paginated(res, interviews, page, limit, total);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/interviews/:id — Get single interview
export const getInterview = async (req, res, next) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).lean();

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found.' });
    }

    return success(res, { interview });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/interviews/:id/answer — Submit an answer
export const submitAnswer = async (req, res, next) => {
  try {
    const { questionIndex, answer, codeAnswer, language, timeSpent } = req.body;
    const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found.' });
    }

    if (interview.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Interview is not active.' });
    }

    const answerEntry = interview.answers[questionIndex];
    if (!answerEntry) {
      return res.status(400).json({ success: false, message: 'Invalid question index.' });
    }

    // Get AI feedback
    const feedback = await evaluateAnswer({
      question: answerEntry.questionText,
      answer,
      codeAnswer,
      type: answerEntry.questionType,
      role: interview.targetRole,
    });

    // Update the answer
    interview.answers[questionIndex].userAnswer = answer || '';
    interview.answers[questionIndex].codeAnswer = codeAnswer || '';
    interview.answers[questionIndex].language = language || 'javascript';
    interview.answers[questionIndex].timeSpent = timeSpent || 0;
    interview.answers[questionIndex].aiFeedback = feedback;
    interview.currentQuestionIndex = questionIndex + 1;

    await interview.save();

    return success(res, { feedback, nextQuestionIndex: questionIndex + 1 }, 'Answer submitted');
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/interviews/:id/skip — Skip a question
export const skipQuestion = async (req, res, next) => {
  try {
    const { questionIndex } = req.body;
    const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });

    if (!interview || interview.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Active interview not found.' });
    }

    interview.answers[questionIndex].skipped = true;
    interview.currentQuestionIndex = questionIndex + 1;
    await interview.save();

    return success(res, { nextQuestionIndex: questionIndex + 1 }, 'Question skipped');
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/interviews/:id/complete — Complete the interview
export const completeInterview = async (req, res, next) => {
  try {
    const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found.' });
    }

    // Calculate overall score from answered questions
    const answeredQs = interview.answers.filter((a) => a.aiFeedback?.score != null);
    const overallScore =
      answeredQs.length > 0
        ? Math.round(answeredQs.reduce((sum, a) => sum + a.aiFeedback.score, 0) / answeredQs.length)
        : 0;

    // Generate AI summary
    const summary = await generateInterviewSummary({
      answers: interview.answers,
      type: interview.type,
      role: interview.targetRole,
      overallScore,
    });

    const completedAt = new Date();
    const duration = interview.startedAt
      ? Math.floor((completedAt - interview.startedAt) / 1000)
      : 0;

    interview.status = 'completed';
    interview.overallScore = overallScore;
    interview.summary = summary;
    interview.completedAt = completedAt;
    interview.duration = duration;
    await interview.save();

    // Update user stats
    const user = await User.findById(req.user._id);
    const prevTotal = user.stats.totalInterviews;
    const prevAvg = user.stats.averageScore;

    user.stats.totalInterviews += 1;
    user.stats.totalQuestions += answeredQs.length;
    user.stats.averageScore = Math.round((prevAvg * prevTotal + overallScore) / (prevTotal + 1));
    user.stats.bestScore = Math.max(user.stats.bestScore, overallScore);

    // Streak calculation
    const today = new Date().toDateString();
    const lastPractice = user.stats.lastPracticeDate
      ? new Date(user.stats.lastPracticeDate).toDateString()
      : null;
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (lastPractice === today) {
      // Same day, no streak change
    } else if (lastPractice === yesterday) {
      user.stats.streakDays += 1;
    } else {
      user.stats.streakDays = 1;
    }
    user.stats.lastPracticeDate = new Date();
    await user.save();

    return success(res, { interview, overallScore, summary }, 'Interview completed!');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/interviews/:id
export const deleteInterview = async (req, res, next) => {
  try {
    const interview = await Interview.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found.' });
    }

    return success(res, {}, 'Interview deleted');
  } catch (err) {
    next(err);
  }
};
