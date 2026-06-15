import { Router } from 'express';
import { getDashboard, getPerformance, getLeaderboard } from '../controllers/analyticsController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);

router.get('/dashboard', getDashboard);
router.get('/performance', getPerformance);
router.get('/leaderboard', getLeaderboard);

export default router;
