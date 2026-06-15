import { Router } from 'express';
import { body } from 'express-validator';
import {
  getQuestions,
  getQuestion,
  generateAIQuestions,
  getRandomQuestions,
} from '../controllers/questionController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(protect);

router.get('/', getQuestions);
router.get('/random', getRandomQuestions);
router.get('/:id', getQuestion);

router.post(
  '/generate',
  [
    body('type')
      .isIn(['behavioral', 'technical', 'coding', 'system-design', 'hr'])
      .withMessage('Invalid question type'),
    body('count').optional().isInt({ min: 1, max: 10 }).withMessage('Count must be 1-10'),
  ],
  validate,
  generateAIQuestions
);

export default router;
