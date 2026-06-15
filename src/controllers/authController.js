import User from '../models/User.js';
import { createTokenPair, signAccessToken, verifyToken } from '../utils/jwt.js';
import { success, created } from '../utils/response.js';

// POST /api/v1/auth/register
export const register = async (req, res, next) => {
  try {
    const { name, email, password, targetRole, experienceLevel } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const user = await User.create({ name, email, password, targetRole, experienceLevel });
    const { accessToken, refreshToken } = createTokenPair(user._id);

    user.refreshToken = refreshToken;
    user.lastLoginAt = new Date();
    await user.save();

    return created(res, { user, accessToken, refreshToken }, 'Registration successful');
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password +refreshToken');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated.' });
    }

    const { accessToken, refreshToken } = createTokenPair(user._id);
    user.refreshToken = refreshToken;
    user.lastLoginAt = new Date();
    await user.save();

    // Remove sensitive fields before sending
    const safeUser = user.toJSON();

    return success(res, { user: safeUser, accessToken, refreshToken }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/auth/refresh
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Refresh token required.' });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
    }

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ success: false, message: 'Invalid token type.' });
    }

    const user = await User.findById(decoded.sub).select('+refreshToken');
    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ success: false, message: 'Refresh token mismatch.' });
    }

    const { accessToken, refreshToken: newRefreshToken } = createTokenPair(user._id);
    user.refreshToken = newRefreshToken;
    await user.save();

    return success(res, { accessToken, refreshToken: newRefreshToken }, 'Token refreshed');
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/auth/logout
export const logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    return success(res, {}, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/auth/me
export const getMe = async (req, res) => {
  return success(res, { user: req.user });
};
