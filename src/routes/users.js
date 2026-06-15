import { Router } from 'express';
import { body } from 'express-validator';
import { getProfile, updateProfile, changePassword, deleteAccount } from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(protect);

router.get('/profile', getProfile);

router.put(
  '/profile',
  [
    body('name').optional().trim().isLength({ min: 2, max: 80 }),
    body('experienceLevel').optional().isIn(['entry', 'mid', 'senior', 'lead', '']),
  ],
  validate,
  updateProfile
);

router.put(
  '/password',
  [
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  validate,
  changePassword
);

router.delete('/account', deleteAccount);

export default router;
