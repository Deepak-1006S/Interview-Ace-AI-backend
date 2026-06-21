import Interview from '../models/Interview.js';
import Question from '../models/Question.js';
import User from '../models/User.js';
import { generateQuestions, evaluateAnswer, generateInterviewSummary } from '../services/aiService.js';
import { success, created } from '../utils/response.js';
import {
  formatInterview,
  formatInterviewList,
  mapExperienceToDifficulty,
} from '../utils/interviewFormatter.js';

const inferInterviewType = (body) => {
  if (body.type) return body.type;
  const role = (body.jobRole || body.targetRole || '').toLowerCase();
  if (role.includes('data') || role.includes('ml')) return 'technical';
  if (role.includes('devops') || role.includes('sre')) return 'system-design';
  return 'mixed';
};

// POST /api/v1/interviews — Create and start a new interview
export const createInterview = async (req, res, next) => {
  try {
    const {
      type: bodyType,
      difficulty: bodyDifficulty,
      targetRole,
      targetCompany,
      questionCount = 5,
      title,
      jobRole,
      experienceLevel,
    } = req.body;

    const user = req.user;
    const type = inferInterviewType(req.body);
    const difficulty = bodyDifficulty || mapExperienceToDifficulty(experienceLevel) || 'medium';
    const role = targetRole || jobRole || user.targetRole;
    const company = targetCompany || user.targetCompany;

    let questions = await Question.find({
      type: type === 'mixed' ? { $in: ['behavioral', 'technical', 'coding', 'hr'] } : type,
      difficulty,
      isActive: true,
      ...(role && { roles: { $in: [role.toLowerCase()] } }),
    })
      .limit(questionCount * 2)
      .lean();

    let questionsForInterview;

    if (questions.length >= questionCount) {
      questions = questions.sort(() => Math.random() - 0.5).slice(0, questionCount);
      questionsForInterview = questions.map((q) => ({
        questionId: q._id,
        questionText: q.text,
        questionType: q.type,
        aiFeedback: {},
      }));
    } else {
      const aiQuestions = await generateQuestions({
        type,
        difficulty,
        role,
        company,
        count: questionCount,
      });

      const savedQs = await Question.insertMany(
        aiQuestions.map((q) => ({
          ...q,
          roles: role ? [role.toLowerCase()] : [],
          companies: company ? [company.toLowerCase()] : [],
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
      title: title || `${role || type} Interview - ${new Date().toLocaleDateString()}`,
      type,
      difficulty,
      targetRole: role || '',
      targetCompany: company || '',
      answers: questionsForInterview,
      totalQuestions: questionsForInterview.length,
      status: 'active',
      startedAt: new Date(),
    });

    return created(res, { interview: formatInterview(interview) }, 'Interview started');
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
    if (status) {
      const statusMap = { 'in-progress': 'active', pending: 'pending', completed: 'completed' };
      filter.status = statusMap[status] || status;
    }
    if (type) filter.type = type;

    const [interviews, total] = await Promise.all([
      Interview.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-answers.aiFeedback.sampleAnswer')
        .lean(),
      Interview.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        interviews: formatInterviewList(interviews),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      },
    });
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

    return success(res, { interview: formatInterview(interview) });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/interviews/:id/progress — Auto-save progress
export const saveProgress = async (req, res, next) => {
  try {
    const { answers = [], currentIndex = 0 } = req.body;
    const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });

    if (!interview || interview.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Active interview not found.' });
    }

    answers.forEach((answer, index) => {
      if (interview.answers[index] && typeof answer === 'string') {
        interview.answers[index].userAnswer = answer;
      }
    });

    interview.currentQuestionIndex = currentIndex;
    await interview.save();

    return success(res, { interview: formatInterview(interview) }, 'Progress saved');
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/interviews/:id/submit — Batch submit all answers
export const batchSubmit = async (req, res, next) => {
  try {
    const { answers = [], duration = 0 } = req.body;
    const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found.' });
    }

    if (interview.status === 'completed') {
      return success(res, { interview: formatInterview(interview) }, 'Interview already completed');
    }

    for (let i = 0; i < interview.answers.length; i++) {
      const userAnswer = answers[i] || '';
      interview.answers[i].userAnswer = userAnswer;

      if (userAnswer.trim()) {
        const feedback = await evaluateAnswer({
          question: interview.answers[i].questionText,
          answer: userAnswer,
          type: interview.answers[i].questionType,
          role: interview.targetRole,
        });
        interview.answers[i].aiFeedback = feedback;
      } else {
        interview.answers[i].skipped = true;
        interview.answers[i].aiFeedback = {
          score: 0,
          strengths: [],
          improvements: ['Question was not answered'],
          detailedFeedback: 'No answer provided.',
          sampleAnswer: '',
          keywords: [],
          followUpQuestions: [],
        };
      }
    }

    const answeredQs = interview.answers.filter((a) => a.aiFeedback?.score != null);
    const overallScore =
      answeredQs.length > 0
        ? Math.round(answeredQs.reduce((sum, a) => sum + a.aiFeedback.score, 0) / answeredQs.length)
        : 0;

    const summary = await generateInterviewSummary({
      answers: interview.answers,
      type: interview.type,
      role: interview.targetRole,
      overallScore,
    });

    const completedAt = new Date();
    interview.status = 'completed';
    interview.overallScore = overallScore;
    interview.summary = summary;
    interview.completedAt = completedAt;
    interview.duration = duration ? duration * 60 : Math.floor((completedAt - interview.startedAt) / 1000);
    interview.currentQuestionIndex = interview.answers.length;
    await interview.save();

    const user = await User.findById(req.user._id);
    const prevTotal = user.stats.totalInterviews;
    const prevAvg = user.stats.averageScore;

    user.stats.totalInterviews += 1;
    user.stats.totalQuestions += answeredQs.length;
    user.stats.averageScore = Math.round((prevAvg * prevTotal + overallScore) / (prevTotal + 1));
    user.stats.bestScore = Math.max(user.stats.bestScore, overallScore);

    const today = new Date().toDateString();
    const lastPractice = user.stats.lastPracticeDate
      ? new Date(user.stats.lastPracticeDate).toDateString()
      : null;
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (lastPractice !== today) {
      if (lastPractice === yesterday) {
        user.stats.streakDays += 1;
      } else {
        user.stats.streakDays = 1;
      }
    }
    user.stats.lastPracticeDate = new Date();
    await user.save();

    return success(res, { interview: formatInterview(interview), overallScore, summary }, 'Interview completed!');
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

    const feedback = await evaluateAnswer({
      question: answerEntry.questionText,
      answer,
      codeAnswer,
      type: answerEntry.questionType,
      role: interview.targetRole,
    });

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

    const answeredQs = interview.answers.filter((a) => a.aiFeedback?.score != null);
    const overallScore =
      answeredQs.length > 0
        ? Math.round(answeredQs.reduce((sum, a) => sum + a.aiFeedback.score, 0) / answeredQs.length)
        : 0;

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

    const user = await User.findById(req.user._id);
    const prevTotal = user.stats.totalInterviews;
    const prevAvg = user.stats.averageScore;

    user.stats.totalInterviews += 1;
    user.stats.totalQuestions += answeredQs.length;
    user.stats.averageScore = Math.round((prevAvg * prevTotal + overallScore) / (prevTotal + 1));
    user.stats.bestScore = Math.max(user.stats.bestScore, overallScore);

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

    return success(res, { interview: formatInterview(interview), overallScore, summary }, 'Interview completed!');
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
