const difficultyToLevel = {
  easy: 'entry',
  medium: 'mid',
  hard: 'senior',
};

const levelToDifficulty = {
  entry: 'easy',
  mid: 'medium',
  senior: 'hard',
  lead: 'hard',
};

const statusToClient = {
  active: 'in-progress',
  pending: 'pending',
  completed: 'completed',
  abandoned: 'pending',
};

export const mapExperienceToDifficulty = (level) => levelToDifficulty[level] || 'medium';

export const formatQuestion = (answer, interview) => ({
  question: answer.questionText,
  category: answer.questionType || 'general',
  difficulty: interview.difficulty,
  userAnswer: answer.userAnswer || '',
  score: answer.aiFeedback?.score ?? null,
  aiFeedback: answer.aiFeedback?.detailedFeedback || '',
  aiStrengths: answer.aiFeedback?.strengths || [],
  aiImprovements: answer.aiFeedback?.improvements || [],
  aiSampleAnswer: answer.aiFeedback?.sampleAnswer || '',
  aiGenerated: true,
});

export const formatInterview = (interview) => {
  if (!interview) return null;

  const doc = interview.toObject ? interview.toObject() : interview;

  return {
    ...doc,
    jobRole: doc.targetRole || '',
    experienceLevel: difficultyToLevel[doc.difficulty] || 'mid',
    status: statusToClient[doc.status] || doc.status,
    feedback: doc.summary?.overallFeedback || '',
    questions: (doc.answers || []).map((a) => formatQuestion(a, doc)),
    lastSavedIndex: doc.currentQuestionIndex || 0,
    duration: doc.duration ? Math.round(doc.duration / 60) : 0,
  };
};

export const formatInterviewList = (interviews) =>
  (interviews || []).map((i) => formatInterview(i));
