import { Router } from 'express';
import { query } from 'express-validator';
import {
  getLeaderboard,
  getMyRank,
} from '../controllers/leaderboardController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get(
  '/',
  [
    query('period').optional().isIn(['all', 'week', 'month']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  getLeaderboard
);

router.get('/me', protect, getMyRank);

export default router;
