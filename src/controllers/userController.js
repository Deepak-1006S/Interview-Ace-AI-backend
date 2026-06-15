import User from '../models/User.js';
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
