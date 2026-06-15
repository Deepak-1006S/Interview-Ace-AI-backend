import Interview from '../models/Interview.js';
import User from '../models/User.js';
import { success } from '../utils/response.js';

// GET /api/v1/analytics/dashboard
export const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [user, recentInterviews, scoresByType, scoresByDifficulty, weeklyActivity] =
      await Promise.all([
        User.findById(userId).select('stats').lean(),

        // Recent 5 interviews
        Interview.find({ user: userId, status: 'completed' })
          .sort({ completedAt: -1 })
          .limit(5)
          .select('type difficulty overallScore completedAt duration title')
          .lean(),

        // Average score by type
        Interview.aggregate([
          { $match: { user: userId, status: 'completed' } },
          { $group: { _id: '$type', avgScore: { $avg: '$overallScore' }, count: { $sum: 1 } } },
        ]),

        // Average score by difficulty
        Interview.aggregate([
          { $match: { user: userId, status: 'completed' } },
          { $group: { _id: '$difficulty', avgScore: { $avg: '$overallScore' }, count: { $sum: 1 } } },
        ]),

        // Weekly activity (last 7 days)
        Interview.aggregate([
          {
            $match: {
              user: userId,
              status: 'completed',
              completedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
          },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
              count: { $sum: 1 },
              avgScore: { $avg: '$overallScore' },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

    // Score trend (last 10 interviews)
    const scoreTrend = await Interview.find({ user: userId, status: 'completed' })
      .sort({ completedAt: -1 })
      .limit(10)
      .select('overallScore completedAt type')
      .lean();

    return success(res, {
      stats: user.stats,
      recentInterviews,
      scoresByType: scoresByType.map((s) => ({
        type: s._id,
        avgScore: Math.round(s.avgScore),
        count: s.count,
      })),
      scoresByDifficulty: scoresByDifficulty.map((s) => ({
        difficulty: s._id,
        avgScore: Math.round(s.avgScore),
        count: s.count,
      })),
      weeklyActivity,
      scoreTrend: scoreTrend.reverse(),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/analytics/performance
export const getPerformance = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { from, to, type } = req.query;

    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);

    const filter = { user: userId, status: 'completed' };
    if (Object.keys(dateFilter).length) filter.completedAt = dateFilter;
    if (type) filter.type = type;

    const interviews = await Interview.find(filter)
      .sort({ completedAt: 1 })
      .select('type difficulty overallScore completedAt duration answers')
      .lean();

    // Skill breakdown from answer-level feedback
    const skillMap = {};
    interviews.forEach((iv) => {
      iv.answers.forEach((a) => {
        if (a.aiFeedback?.score != null) {
          const cat = a.questionType || 'general';
          if (!skillMap[cat]) skillMap[cat] = { total: 0, count: 0 };
          skillMap[cat].total += a.aiFeedback.score;
          skillMap[cat].count += 1;
        }
      });
    });

    const skillBreakdown = Object.entries(skillMap).map(([skill, data]) => ({
      skill,
      avgScore: Math.round(data.total / data.count),
      questionsAnswered: data.count,
    }));

    return success(res, {
      interviews: interviews.map((iv) => ({
        id: iv._id,
        type: iv.type,
        difficulty: iv.difficulty,
        score: iv.overallScore,
        date: iv.completedAt,
        duration: iv.duration,
      })),
      skillBreakdown,
      totalInterviews: interviews.length,
      avgScore:
        interviews.length > 0
          ? Math.round(interviews.reduce((s, i) => s + i.overallScore, 0) / interviews.length)
          : 0,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/analytics/leaderboard
export const getLeaderboard = async (req, res, next) => {
  try {
    const top = await User.find({ isActive: true, 'stats.totalInterviews': { $gte: 1 } })
      .sort({ 'stats.averageScore': -1, 'stats.totalInterviews': -1 })
      .limit(20)
      .select('name stats.averageScore stats.totalInterviews stats.bestScore stats.streakDays')
      .lean();

    return success(res, { leaderboard: top });
  } catch (err) {
    next(err);
  }
};
