/** Static questions used when Anthropic AI is unavailable */
export const fallbackQuestions = [
  {
    text: 'Tell me about a time you faced a significant challenge at work. How did you handle it?',
    type: 'behavioral',
    difficulty: 'medium',
    category: 'problem-solving',
    tags: ['challenge', 'adversity', 'STAR'],
    timeLimitSeconds: 180,
    expectedKeywords: ['situation', 'task', 'action', 'result'],
    followUpQuestions: ['What would you do differently?'],
  },
  {
    text: 'Explain the difference between REST and GraphQL. When would you choose one over the other?',
    type: 'technical',
    difficulty: 'medium',
    category: 'api-design',
    tags: ['REST', 'GraphQL', 'API'],
    timeLimitSeconds: 180,
    expectedKeywords: ['REST', 'GraphQL', 'schema', 'endpoints'],
  },
  {
    text: 'What is the event loop in JavaScript? How does it work?',
    type: 'technical',
    difficulty: 'medium',
    category: 'javascript',
    tags: ['javascript', 'async', 'event-loop'],
    timeLimitSeconds: 150,
    expectedKeywords: ['call stack', 'task queue', 'microtask'],
  },
  {
    text: 'Implement a function that finds two numbers in an array that add up to a target sum.',
    type: 'coding',
    difficulty: 'easy',
    category: 'arrays',
    tags: ['arrays', 'hash-map'],
    timeLimitSeconds: 300,
    starterCode: 'function twoSum(nums, target) {\n  // Your solution here\n}',
    language: 'javascript',
    expectedKeywords: ['hash map', 'O(n)'],
  },
  {
    text: 'Design a URL shortening service like bit.ly. What components would you include?',
    type: 'system-design',
    difficulty: 'medium',
    category: 'system-design',
    tags: ['scalability', 'database'],
    timeLimitSeconds: 600,
    expectedKeywords: ['hash', 'database', 'cache', 'scalability'],
  },
  {
    text: 'Why are you interested in this role and our company?',
    type: 'hr',
    difficulty: 'easy',
    category: 'motivation',
    tags: ['motivation', 'fit'],
    timeLimitSeconds: 120,
  },
  {
    text: 'Describe a situation where you had to work with a difficult team member.',
    type: 'behavioral',
    difficulty: 'medium',
    category: 'teamwork',
    tags: ['conflict', 'collaboration'],
    timeLimitSeconds: 180,
    expectedKeywords: ['communication', 'empathy', 'resolution'],
  },
  {
    text: 'How does React reconciliation work? What is the virtual DOM?',
    type: 'technical',
    difficulty: 'medium',
    category: 'react',
    tags: ['react', 'virtual-dom'],
    timeLimitSeconds: 150,
    expectedKeywords: ['virtual DOM', 'diffing', 'reconciliation'],
  },
  {
    text: 'Explain database indexing and when you should and should not use indexes.',
    type: 'technical',
    difficulty: 'medium',
    category: 'databases',
    tags: ['database', 'indexing'],
    timeLimitSeconds: 180,
    expectedKeywords: ['B-tree', 'query performance', 'write overhead'],
  },
  {
    text: 'What is your greatest weakness, and how are you working on it?',
    type: 'hr',
    difficulty: 'medium',
    category: 'self-awareness',
    tags: ['weakness', 'growth'],
    timeLimitSeconds: 120,
    expectedKeywords: ['improvement', 'steps taken'],
  },
];

export const pickFallbackQuestions = (type, difficulty, count = 5) => {
  const pool = fallbackQuestions.filter(
    (q) => q.type === type || type === 'mixed' || !type
  );
  const source = pool.length >= count ? pool : fallbackQuestions;
  return [...source].sort(() => Math.random() - 0.5).slice(0, count);
};
