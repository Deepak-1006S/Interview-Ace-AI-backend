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

    // Map AI response shape → frontend-expected shape
    const sa = analysis.strengthAreas || {};
    const resume = {
      _id: `${req.user._id}_${Date.now()}`,
      fileName: file.originalname,
      targetRole: targetRole || 'Software Engineer',
      createdAt: new Date().toISOString(),
      wordCount: resumeContent.trim().split(/\s+/).length,

      // Scores
      atsScore: analysis.atsScore ?? analysis.overallScore ?? 70,
      keywordScore: sa.technical?.score ?? analysis.matchWithRole?.score ?? 70,
      formatScore: sa.format?.score ?? 70,
      contentScore: sa.experience?.score ?? 70,
      readabilityScore: sa.education?.score ?? 70,

      // Strengths: flatten from strengthAreas highlights
      strengths: [
        ...(sa.technical?.highlights || []),
        ...(sa.experience?.highlights || []),
        ...(sa.education?.highlights || []),
      ],

      // Weaknesses: format issues + match reasoning
      weaknesses: [
        ...(sa.format?.issues || []),
        ...(analysis.matchWithRole?.reasoning ? [analysis.matchWithRole.reasoning] : []),
      ],

      // Suggestions & recommended changes
      suggestions: [
        ...(analysis.improvements || []),
        ...(analysis.recommendedChanges || []),
      ],

      // Keywords: extracted from highlights across all areas
      keywords: [
        ...(sa.technical?.highlights || []),
      ].filter((k) => k.length < 40),

      missingKeywords: analysis.missingKeywords || [],
      summary: analysis.summary || '',
    };

    return created(res, { resume }, 'Resume analyzed successfully');
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/resume  &  /api/v1/resume/history
export const getResumeHistory = async (req, res, next) => {
  try {
    return success(res, { resumes: [] }, 'Resume history retrieved');
  } catch (err) {
    next(err);
  }
};
