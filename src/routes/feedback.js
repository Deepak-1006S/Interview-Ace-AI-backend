import { Router } from 'express';
import { body } from 'express-validator';
import { evaluateSingle, getFollowUp } from '../controllers/feedbackController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(protect);

router.post(
  '/evaluate',
  [
    body('question').notEmpty().withMessage('Question is required'),
    body('type')
      .isIn(['behavioral', 'technical', 'coding', 'system-design', 'hr'])
      .withMessage('Invalid type'),
  ],
  validate,
  evaluateSingle
);

router.post(
  '/follow-up',
  [
    body('question').notEmpty().withMessage('Question required'),
    body('answer').notEmpty().withMessage('Answer required'),
  ],
  validate,
  getFollowUp
);

export default router;
