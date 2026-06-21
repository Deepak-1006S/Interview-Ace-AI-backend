import Anthropic from '@anthropic-ai/sdk';
import { pickFallbackQuestions } from '../utils/fallbackQuestions.js';

const MODEL = 'claude-sonnet-4-6';
const PLACEHOLDER_PATTERNS = [
  /^your-anthropic-api-key/i,
  /^your_anthropic_api_key/i,
  /^sk-ant-api03-placeholder/i,
  /^replace-me/i,
  /^xxx+$/i,
];

let client = null;

const getApiKey = () => (process.env.ANTHROPIC_API_KEY || '').trim();

export const isAiAvailable = () => {
  const key = getApiKey();
  if (!key) return false;
  if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(key))) return false;
  return key.startsWith('sk-ant-');
};

const getClient = () => {
  if (!isAiAvailable()) return null;
  if (!client) {
    client = new Anthropic({ apiKey: getApiKey() });
  }
  return client;
};

const parseJsonResponse = (text) => {
  const clean = text.trim().replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(clean);
};

/**
 * Generate interview questions based on type, difficulty, role, and company.
 */
export const generateQuestions = async ({ type, difficulty, role, company, count = 5 }) => {
  const anthropic = getClient();

  if (!anthropic) {
    console.warn('[AI] Anthropic API key not configured — using built-in question bank');
    return pickFallbackQuestions(type, difficulty, count);
  }

  const prompt = `You are an expert technical recruiter at top tech companies.
Generate exactly ${count} interview questions for the following context:
- Interview Type: ${type}
- Difficulty: ${difficulty}
- Target Role: ${role || 'Software Engineer'}
- Target Company: ${company || 'a top tech company'}

Return ONLY a valid JSON array with no extra text. Each object must have:
{
  "text": "the question text",
  "type": "${type}",
  "difficulty": "${difficulty}",
  "category": "specific category",
  "tags": ["tag1", "tag2"],
  "timeLimitSeconds": 120,
  "starterCode": "// only for coding questions, empty string otherwise",
  "language": "javascript",
  "followUpQuestions": ["follow-up 1", "follow-up 2"],
  "expectedKeywords": ["keyword1", "keyword2"]
}`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    return parseJsonResponse(response.content[0].text);
  } catch (err) {
    console.warn('[AI] Question generation failed — using built-in question bank:', err.message);
    return pickFallbackQuestions(type, difficulty, count);
  }
};

/**
 * Evaluate a user's answer and return structured feedback.
 */
export const evaluateAnswer = async ({ question, answer, codeAnswer, type, role }) => {
  const isCode = type === 'coding';
  const userResponse = isCode
    ? `Code Answer:\n\`\`\`\n${codeAnswer || ''}\n\`\`\`\n\nExplanation: ${answer || ''}`
    : answer;

  const anthropic = getClient();

  if (!anthropic) {
    const hasContent = Boolean((answer || codeAnswer || '').trim());
    return {
      score: hasContent ? 65 : 0,
      strengths: hasContent ? ['Provided a response to the question'] : [],
      improvements: hasContent
        ? ['Add more specific examples and measurable outcomes', 'Configure ANTHROPIC_API_KEY for detailed AI feedback']
        : ['Provide an answer to receive feedback'],
      detailedFeedback: hasContent
        ? 'Your answer was recorded. Configure a valid Anthropic API key in Backend/.env for full AI-powered evaluation and scoring.'
        : 'No answer was provided for this question.',
      sampleAnswer: 'Configure ANTHROPIC_API_KEY for AI-generated sample answers.',
      keywords: [],
      followUpQuestions: [],
    };
  }

  const prompt = `You are a senior interviewer evaluating a candidate's answer for a ${role || 'Software Engineer'} position.

Question: ${question}
Question Type: ${type}
Candidate's Answer: ${userResponse || '(No answer provided)'}

Evaluate the answer and return ONLY valid JSON with no extra text:
{
  "score": <number 0-100>,
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "detailedFeedback": "2-3 paragraph comprehensive feedback",
  "sampleAnswer": "a strong sample answer to this question",
  "keywords": ["key concepts that should have been mentioned"],
  "followUpQuestions": ["follow-up question 1", "follow-up question 2"]
}

Scoring guide:
- 90-100: Exceptional, covers all aspects with depth
- 70-89: Good, covers most key points
- 50-69: Average, misses some important aspects
- 30-49: Below average, significant gaps
- 0-29: Poor, major issues or no relevant content`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    return parseJsonResponse(response.content[0].text);
  } catch (err) {
    console.warn('[AI] Answer evaluation failed:', err.message);
    const hasContent = Boolean((answer || codeAnswer || '').trim());
    return {
      score: hasContent ? 60 : 0,
      strengths: hasContent ? ['Attempted to answer the question'] : [],
      improvements: ['AI evaluation temporarily unavailable — try again later'],
      detailedFeedback: `Could not reach AI service: ${err.message}`,
      sampleAnswer: '',
      keywords: [],
      followUpQuestions: [],
    };
  }
};

/**
 * Generate an overall interview summary after all questions are answered.
 */
export const generateInterviewSummary = async ({ answers, type, role, overallScore }) => {
  const anthropic = getClient();

  if (!anthropic) {
    return {
      strengths: ['Completed the interview session'],
      areasForImprovement: ['Configure ANTHROPIC_API_KEY for personalized feedback'],
      overallFeedback: `You completed the interview with an average score of ${overallScore}%. Add a valid Anthropic API key to Backend/.env for detailed AI summaries.`,
      recommendedTopics: ['Review your missed questions', 'Practice behavioral STAR responses'],
    };
  }

  const answersText = answers
    .map(
      (a, i) =>
        `Q${i + 1}: ${a.questionText}\nScore: ${a.aiFeedback?.score ?? 'N/A'}/100\nFeedback: ${a.aiFeedback?.detailedFeedback || 'No feedback'}`
    )
    .join('\n\n');

  const prompt = `You are a senior hiring manager summarizing a completed ${type} interview for a ${role || 'Software Engineer'} candidate.

Overall Score: ${overallScore}/100
Interview Answers Summary:
${answersText}

Return ONLY valid JSON:
{
  "strengths": ["top strength 1", "top strength 2", "top strength 3"],
  "areasForImprovement": ["area 1", "area 2", "area 3"],
  "overallFeedback": "2-3 paragraph holistic assessment with actionable advice",
  "recommendedTopics": ["topic to study 1", "topic to study 2", "topic to study 3", "topic to study 4"]
}`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    return parseJsonResponse(response.content[0].text);
  } catch (err) {
    console.warn('[AI] Summary generation failed:', err.message);
    return {
      strengths: ['Completed all interview questions'],
      areasForImprovement: ['Review individual question feedback'],
      overallFeedback: `Interview completed with an overall score of ${overallScore}%. AI summary unavailable: ${err.message}`,
      recommendedTopics: [],
    };
  }
};

/**
 * Generate a follow-up question based on a previous answer (real-time conversation).
 */
export const generateFollowUp = async ({ question, answer, context }) => {
  const anthropic = getClient();
  if (!anthropic) {
    return 'Can you elaborate more on your approach and the outcome?';
  }

  const prompt = `Based on this interview Q&A:
Question: ${question}
Answer: ${answer}
Context: ${context || 'general interview'}

Generate ONE natural follow-up question that digs deeper into their answer.
Return ONLY the question text, nothing else.`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.content[0].text.trim();
  } catch {
    return 'Can you walk me through your thought process in more detail?';
  }
};

/**
 * Stream real-time AI feedback via callback.
 */
export const streamFeedback = async ({ question, answer, type, onChunk }) => {
  const anthropic = getClient();
  if (!anthropic) {
    const fallback = 'Good effort. Consider adding more specific examples to strengthen your answer.';
    if (onChunk) onChunk(fallback);
    return fallback;
  }

  const prompt = `Give brief, encouraging real-time feedback (3-4 sentences) on this interview answer:
Question: ${question}
Answer: ${answer}
Type: ${type}

Be specific, constructive, and mention one key strength and one improvement.`;

  try {
    const stream = await anthropic.messages.stream({
      model: MODEL,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    let fullText = '';
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
        fullText += chunk.delta.text;
        if (onChunk) onChunk(chunk.delta.text);
      }
    }
    return fullText;
  } catch (err) {
    const fallback = `Feedback unavailable: ${err.message}`;
    if (onChunk) onChunk(fallback);
    return fallback;
  }
};

/**
 * Analyze a resume and generate ATS scoring and feedback.
 */
export const generateResumeAnalysis = async ({ resume, targetRole }) => {
  const anthropic = getClient();

  if (!anthropic) {
    return {
      overallScore: 70,
      atsScore: 70,
      strengthAreas: {
        technical: { score: 70, highlights: ['Resume uploaded successfully'] },
        experience: { score: 70, highlights: ['Experience section detected'] },
        education: { score: 70, highlights: ['Education section detected'] },
        format: { score: 70, issues: ['Configure ANTHROPIC_API_KEY for detailed ATS analysis'] },
      },
      improvements: ['Add a valid Anthropic API key for full resume analysis'],
      missingKeywords: [],
      matchWithRole: { score: 70, reasoning: 'Basic analysis only — AI key not configured' },
      recommendedChanges: ['Configure ANTHROPIC_API_KEY in Backend/.env'],
      summary: 'Resume received. Configure a valid Anthropic API key for full AI-powered ATS analysis.',
    };
  }

  const prompt = `You are an ATS (Applicant Tracking System) expert and recruiter analyzing a resume.

Resume Content:
${resume}

Target Role: ${targetRole || 'Software Engineer'}

Analyze the resume and return ONLY valid JSON with no extra text:
{
  "overallScore": <0-100>,
  "atsScore": <0-100>,
  "strengthAreas": {
    "technical": { "score": <0-100>, "highlights": ["item1", "item2"] },
    "experience": { "score": <0-100>, "highlights": ["item1", "item2"] },
    "education": { "score": <0-100>, "highlights": ["item1", "item2"] },
    "format": { "score": <0-100>, "issues": ["issue1", "issue2"] }
  },
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "missingKeywords": ["keyword1", "keyword2", "keyword3"],
  "matchWithRole": { "score": <0-100>, "reasoning": "explanation" },
  "recommendedChanges": ["change1", "change2", "change3"],
  "summary": "1-2 paragraph overall assessment"
}`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  return parseJsonResponse(response.content[0].text);
};
