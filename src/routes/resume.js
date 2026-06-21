import { Router } from 'express';
import multer from 'multer';
import { uploadResume, getResumeHistory } from '../controllers/resumeController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'text/plain'];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

router.post('/upload', upload.single('resume'), uploadResume);
router.get('/history', getResumeHistory);

export default router;
