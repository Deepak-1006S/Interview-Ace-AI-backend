import User from '../models/User.js';
import Interview from '../models/Interview.js';
import { success } from '../utils/response.js';

// GET /api/v1/users/profile
export const getProfile = async (req, res) => {
  return success(res, { user: req.user });
};

// PUT /api/v1/users/profile
export const updateProfile = async (req, res, next) => {
  try {
    const allowed = ['name', 'targetRole', 'targetCompany', 'experienceLevel', 'avatar'];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    return success(res, { user }, 'Profile updated');
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/users/password
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    user.password = newPassword;
    await user.save();

    return success(res, {}, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/users/account
export const deleteAccount = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { isActive: false, refreshToken: null });
    return success(res, {}, 'Account deactivated');
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/users/stats
export const getUserStats = async (req, res, next) => {
  try {
    // Get user's interviews
    const interviews = await Interview.find({ user: req.user._id, status: 'completed' }).lean();

    // Calculate stats
    const totalInterviews = interviews.length;
    const scores = interviews.map((i) => i.overallScore).filter((s) => s != null);
    const averageScore = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0;
    const bestScore = Math.max(...scores, 0);

    // Score history (last 10 interviews)
    const scoreHistory = interviews
      .slice(-10)
      .map((i) => ({
        date: i.completedAt,
        score: i.overallScore,
        role: i.targetRole,
      }))
      .reverse();

    // Category performance
    const categoryStats = {};
    interviews.forEach((interview) => {
      const category = interview.type || 'general';
      if (!categoryStats[category]) {
        categoryStats[category] = { scores: [], count: 0 };
      }
      if (interview.overallScore != null) {
        categoryStats[category].scores.push(interview.overallScore);
      }
      categoryStats[category].count++;
    });

    const categoryPerformance = Object.entries(categoryStats).map(([category, data]) => ({
      category,
      averageScore: data.scores.length > 0 ? Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 10) / 10 : 0,
      totalAttempts: data.count,
    }));

    // Role distribution
    const roleStats = {};
    interviews.forEach((interview) => {
      const role = interview.targetRole || 'Unknown';
      roleStats[role] = (roleStats[role] || 0) + 1;
    });

    const roleDistribution = Object.entries(roleStats).map(([role, count]) => ({
      role,
      count,
    }));

    // Time stats
    const totalPracticeTime = Math.round(
      interviews.reduce((sum, i) => sum + (i.duration || 0), 0) / 60
    ); // in minutes

    // Streak calculation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Simple streak logic based on completed interviews
    const completedDates = new Set(
      interviews.map((i) => {
        const d = new Date(i.completedAt);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    );

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      if (completedDates.has(checkDate.getTime())) {
        tempStreak++;
        if (i === 0) currentStreak = tempStreak;
      } else if (tempStreak > 0) {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 0;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    const stats = {
      totalInterviews,
      averageScore,
      bestScore,
      scoreHistory,
      categoryPerformance,
      roleDistribution,
      totalPracticeTime,
      currentStreak,
      longestStreak,
    };

    return success(res, { stats });
  } catch (err) {
    next(err);
  }
};
