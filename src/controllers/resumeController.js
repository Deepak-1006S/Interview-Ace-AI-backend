import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateResumeAnalysis } from '../services/aiService.js';
import { created, success } from '../utils/response.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// POST /api/v1/resume/upload
export const uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { targetRole } = req.body;
    const file = req.file;

    // Read file content
    let resumeContent = '';
    if (file.mimetype === 'application/pdf') {
      // For PDF, we'd normally use a PDF parser, but for now just read as text
      resumeContent = file.buffer.toString('utf-8');
    } else {
      resumeContent = file.buffer.toString('utf-8');
    }

    // Generate AI analysis
    const analysis = await generateResumeAnalysis({
      resume: resumeContent,
      targetRole: targetRole || 'Software Engineer',
    });

    // Store analysis with metadata
    const resumeData = {
      filename: file.originalname,
      uploadedAt: new Date(),
      targetRole: targetRole || 'Software Engineer',
      analysis,
      userId: req.user._id,
    };

    return created(res, analysis, 'Resume analyzed successfully');
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/resume/history
export const getResumeHistory = async (req, res, next) => {
  try {
    // This would typically fetch from a database
    // For now, return empty array
    return success(res, { history: [] }, 'Resume history retrieved');
  } catch (err) {
    next(err);
  }
};
