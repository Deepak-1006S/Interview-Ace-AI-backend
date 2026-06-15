import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

export const signAccessToken = (userId) =>
  jwt.sign({ sub: userId, type: 'access' }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

export const signRefreshToken = (userId) =>
  jwt.sign({ sub: userId, type: 'refresh' }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });

export const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

export const createTokenPair = (userId) => ({
  accessToken: signAccessToken(userId),
  refreshToken: signRefreshToken(userId),
});
