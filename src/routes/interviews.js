import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  createInterview,
  getInterviews,
  getInterview,
  submitAnswer,
  skipQuestion,
  completeInterview,
  deleteInterview,
} from '../controllers/interviewController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(protect);

router.get('/', getInterviews);

router.post(
  '/',
  [
    body('type')
      .isIn(['behavioral', 'technical', 'coding', 'system-design', 'mixed', 'hr'])
      .withMessage('Invalid interview type'),
    body('difficulty')
      .optional()
      .isIn(['easy', 'medium', 'hard'])
      .withMessage('Invalid difficulty'),
    body('questionCount').optional().isInt({ min: 1, max: 20 }).withMessage('1-20 questions allowed'),
  ],
  validate,
  createInterview
);

router.get('/:id', getInterview);

router.post(
  '/:id/answer',
  [
    body('questionIndex').isInt({ min: 0 }).withMessage('Valid question index required'),
  ],
  validate,
  submitAnswer
);

router.post(
  '/:id/skip',
  [body('questionIndex').isInt({ min: 0 }).withMessage('Valid question index required')],
  validate,
  skipQuestion
);

router.post('/:id/complete', completeInterview);
router.delete('/:id', deleteInterview);

export default router;
