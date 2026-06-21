import { Router } from 'express';
import { query, param, body } from 'express-validator';
import {
  getChallenges,
  getChallenge,
  submitSolution,
} from '../controllers/codingController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get(
  '/',
  [
    query('difficulty').optional().isIn(['easy', 'medium', 'hard']),
    query('search').optional().trim().isLength({ max: 100 }),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  getChallenges
);

router.get('/:id', [param('id').isMongoId()], validate, getChallenge);

router.post(
  '/:id/submit',
  protect,
  [
    param('id').isMongoId(),
    body('code').notEmpty(),
    body('language').notEmpty(),
  ],
  validate,
  submitSolution
);

export default router;
