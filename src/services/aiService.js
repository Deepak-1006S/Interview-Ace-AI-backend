import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = 'claude-sonnet-4-6';

/**
 * Generate interview questions based on type, difficulty, role, and company.
 */
export const generateQuestions = async ({ type, difficulty, role, company, count = 5 }) => {
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

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text.trim();
  // Strip markdown fences if present
  const clean = text.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(clean);
};

/**
 * Evaluate a user's answer and return structured feedback.
 */
export const evaluateAnswer = async ({ question, answer, codeAnswer, type, role }) => {
  const isCode = type === 'coding';
  const userResponse = isCode
    ? `Code Answer:\n\`\`\`\n${codeAnswer || ''}\n\`\`\`\n\nExplanation: ${answer || ''}`
    : answer;

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

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text.trim();
  const clean = text.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(clean);
};

/**
 * Generate an overall interview summary after all questions are answered.
 */
export const generateInterviewSummary = async ({ answers, type, role, overallScore }) => {
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

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text.trim();
  const clean = text.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(clean);
};

/**
 * Generate a follow-up question based on a previous answer (real-time conversation).
 */
export const generateFollowUp = async ({ question, answer, context }) => {
  const prompt = `Based on this interview Q&A:
Question: ${question}
Answer: ${answer}
Context: ${context || 'general interview'}

Generate ONE natural follow-up question that digs deeper into their answer.
Return ONLY the question text, nothing else.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].text.trim();
};

/**
 * Stream real-time AI feedback via callback.
 */
export const streamFeedback = async ({ question, answer, type, onChunk }) => {
  const prompt = `Give brief, encouraging real-time feedback (3-4 sentences) on this interview answer:
Question: ${question}
Answer: ${answer}
Type: ${type}

Be specific, constructive, and mention one key strength and one improvement.`;

  const stream = await client.messages.stream({
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
};
