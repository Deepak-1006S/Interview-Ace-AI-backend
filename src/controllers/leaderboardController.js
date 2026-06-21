import Interview from '../models/Interview.js';
import User from '../models/User.js';
import { success } from '../utils/response.js';

// GET /api/v1/leaderboard - Get global leaderboard
export const getLeaderboard = async (req, res, next) => {
  try {
    const { period = 'all', limit = 20 } = req.query;
    const pageLimit = Math.min(parseInt(limit) || 20, 100);

    // Calculate date filter based on period
    let dateFilter = {};
    if (period === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = { completedAt: { $gte: weekAgo } };
    } else if (period === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      dateFilter = { completedAt: { $gte: monthAgo } };
    }

    // Aggregate stats from interviews
    const leaderboard = await Interview.aggregate([
      {
        $match: {
          status: 'completed',
          overallScore: { $ne: null },
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: '$user',
          averageScore: { $avg: '$overallScore' },
          bestScore: { $max: '$overallScore' },
          totalInterviews: { $sum: 1 },
          lastCompleted: { $max: '$completedAt' },
        },
      },
      {
        $sort: { averageScore: -1, bestScore: -1 },
      },
      {
        $limit: pageLimit,
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          name: '$user.name',
          avatar: '$user.avatar',
          averageScore: { $round: ['$averageScore', 1] },
          bestScore: '$bestScore',
          totalInterviews: 1,
          lastCompleted: 1,
        },
      },
    ]);

    return success(res, { leaderboard });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/leaderboard/me - Get user's rank
export const getMyRank = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Get user's stats
    const userStats = await Interview.aggregate([
      {
        $match: {
          user: userId,
          status: 'completed',
          overallScore: { $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          averageScore: { $avg: '$overallScore' },
          bestScore: { $max: '$overallScore' },
          totalInterviews: { $sum: 1 },
        },
      },
    ]);

    if (!userStats || userStats.length === 0) {
      return success(res, { rank: null, totalUsers: 0, averageScore: 0 });
    }

    const stats = userStats[0];

    // Get user's rank
    const rank = await Interview.aggregate([
      {
        $match: {
          status: 'completed',
          overallScore: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$user',
          averageScore: { $avg: '$overallScore' },
        },
      },
      {
        $match: {
          averageScore: { $gt: stats.averageScore },
        },
      },
      {
        $count: 'count',
      },
    ]);

    const userRank = (rank[0]?.count || 0) + 1;

    // Get total users with completed interviews
    const totalUsersRes = await Interview.aggregate([
      {
        $match: {
          status: 'completed',
          overallScore: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$user',
        },
      },
      {
        $count: 'count',
      },
    ]);

    const totalUsers = totalUsersRes[0]?.count || 0;

    return success(res, {
      rank: userRank,
      totalUsers,
      averageScore: Math.round(stats.averageScore * 10) / 10,
      bestScore: stats.bestScore,
      totalInterviews: stats.totalInterviews,
    });
  } catch (err) {
    next(err);
  }
};
