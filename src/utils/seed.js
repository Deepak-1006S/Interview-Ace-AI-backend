import 'dotenv/config';
import { connectDB } from '../config/database.js';
import Question from '../models/Question.js';
import User from '../models/User.js';

const sampleQuestions = [
  // Behavioral
  {
    text: 'Tell me about a time you faced a significant challenge at work. How did you handle it?',
    type: 'behavioral',
    difficulty: 'medium',
    category: 'problem-solving',
    tags: ['challenge', 'adversity', 'STAR'],
    timeLimitSeconds: 180,
    expectedKeywords: ['situation', 'task', 'action', 'result', 'team', 'outcome'],
    followUpQuestions: ['What would you do differently?', 'How did it affect the team?'],
  },
  {
    text: 'Describe a situation where you had to work with a difficult team member.',
    type: 'behavioral',
    difficulty: 'medium',
    category: 'teamwork',
    tags: ['conflict', 'collaboration', 'communication'],
    timeLimitSeconds: 180,
    expectedKeywords: ['communication', 'empathy', 'resolution', 'compromise'],
  },
  {
    text: "Give an example of a time you showed leadership, even if you weren't in a leadership role.",
    type: 'behavioral',
    difficulty: 'medium',
    category: 'leadership',
    tags: ['leadership', 'initiative', 'influence'],
    timeLimitSeconds: 180,
    expectedKeywords: ['initiative', 'team', 'impact', 'result'],
  },
  {
    text: 'Tell me about a time you had to learn something new very quickly.',
    type: 'behavioral',
    difficulty: 'easy',
    category: 'learning',
    tags: ['adaptability', 'growth', 'learning'],
    timeLimitSeconds: 120,
  },

  // Technical
  {
    text: 'Explain the difference between REST and GraphQL. When would you choose one over the other?',
    type: 'technical',
    difficulty: 'medium',
    category: 'api-design',
    tags: ['REST', 'GraphQL', 'API', 'architecture'],
    timeLimitSeconds: 180,
    expectedKeywords: ['REST', 'GraphQL', 'over-fetching', 'under-fetching', 'schema', 'endpoints'],
  },
  {
    text: 'What is the event loop in JavaScript? How does it work?',
    type: 'technical',
    difficulty: 'medium',
    category: 'javascript',
    tags: ['javascript', 'async', 'event-loop', 'concurrency'],
    timeLimitSeconds: 150,
    expectedKeywords: ['call stack', 'task queue', 'microtask', 'async', 'non-blocking'],
  },
  {
    text: 'Explain SOLID principles and give an example of each.',
    type: 'technical',
    difficulty: 'hard',
    category: 'software-design',
    tags: ['SOLID', 'OOP', 'design-principles'],
    timeLimitSeconds: 240,
    expectedKeywords: ['Single Responsibility', 'Open/Closed', 'Liskov', 'Interface', 'Dependency'],
  },
  {
    text: 'How does React reconciliation work? What is the virtual DOM?',
    type: 'technical',
    difficulty: 'medium',
    category: 'react',
    tags: ['react', 'virtual-dom', 'reconciliation', 'rendering'],
    timeLimitSeconds: 150,
    expectedKeywords: ['virtual DOM', 'diffing', 'fiber', 'keys', 'reconciliation'],
  },
  {
    text: 'Explain database indexing and when you should and should not use indexes.',
    type: 'technical',
    difficulty: 'medium',
    category: 'databases',
    tags: ['database', 'indexing', 'performance', 'SQL'],
    timeLimitSeconds: 180,
    expectedKeywords: ['B-tree', 'query performance', 'write overhead', 'cardinality', 'composite'],
  },

  // Coding
  {
    text: 'Implement a function that finds the two numbers in an array that add up to a target sum.',
    type: 'coding',
    difficulty: 'easy',
    category: 'arrays',
    tags: ['arrays', 'hash-map', 'two-pointers'],
    timeLimitSeconds: 300,
    starterCode:
      '/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nfunction twoSum(nums, target) {\n  // Your solution here\n}',
    language: 'javascript',
    sampleAnswer:
      'function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) return [map.get(complement), i];\n    map.set(nums[i], i);\n  }\n  return [];\n}',
    expectedKeywords: ['hash map', 'O(n)', 'complement', 'linear time'],
  },
  {
    text: 'Write a function to determine if a string is a valid palindrome, considering only alphanumeric characters.',
    type: 'coding',
    difficulty: 'easy',
    category: 'strings',
    tags: ['strings', 'two-pointers', 'palindrome'],
    timeLimitSeconds: 300,
    starterCode:
      '/**\n * @param {string} s\n * @return {boolean}\n */\nfunction isPalindrome(s) {\n  // Your solution here\n}',
    language: 'javascript',
    expectedKeywords: ['two pointers', 'regex', 'lowercase', 'alphanumeric'],
  },
  {
    text: 'Implement a debounce function in JavaScript.',
    type: 'coding',
    difficulty: 'medium',
    category: 'javascript',
    tags: ['closures', 'timing', 'debounce', 'javascript'],
    timeLimitSeconds: 300,
    starterCode:
      '/**\n * @param {Function} func\n * @param {number} delay\n * @return {Function}\n */\nfunction debounce(func, delay) {\n  // Your solution here\n}',
    language: 'javascript',
    expectedKeywords: ['setTimeout', 'clearTimeout', 'closure', 'timer'],
  },

  // System Design
  {
    text: 'Design a URL shortening service like bit.ly. What components would you include?',
    type: 'system-design',
    difficulty: 'medium',
    category: 'system-design',
    tags: ['scalability', 'database', 'hashing', 'cache'],
    timeLimitSeconds: 600,
    expectedKeywords: ['hash', 'database', 'cache', 'load balancer', 'CDN', 'scalability', 'collision'],
  },
  {
    text: 'How would you design a real-time chat application like Slack or WhatsApp?',
    type: 'system-design',
    difficulty: 'hard',
    category: 'system-design',
    tags: ['websockets', 'messaging', 'scalability', 'real-time'],
    timeLimitSeconds: 600,
    expectedKeywords: ['WebSockets', 'message queue', 'database', 'presence', 'delivery receipts'],
  },

  // HR
  {
    text: 'Why are you interested in this role and our company?',
    type: 'hr',
    difficulty: 'easy',
    category: 'motivation',
    tags: ['motivation', 'company-research', 'fit'],
    timeLimitSeconds: 120,
  },
  {
    text: "Where do you see yourself in 5 years?",
    type: 'hr',
    difficulty: 'easy',
    category: 'career-goals',
    tags: ['career', 'goals', 'growth'],
    timeLimitSeconds: 120,
  },
  {
    text: 'What is your greatest weakness, and how are you working on it?',
    type: 'hr',
    difficulty: 'medium',
    category: 'self-awareness',
    tags: ['weakness', 'growth', 'self-awareness'],
    timeLimitSeconds: 120,
    expectedKeywords: ['genuine', 'improvement', 'steps taken', 'growth'],
  },
];

async function seed() {
  await connectDB();

  console.log('🌱 Seeding database...');

  // Clear existing questions
  await Question.deleteMany({});
  console.log('✅ Cleared existing questions');

  // Insert sample questions
  const inserted = await Question.insertMany(sampleQuestions);
  console.log(`✅ Inserted ${inserted.length} questions`);

  // Create a demo admin user if it doesn't exist
  const adminExists = await User.findOne({ email: 'admin@interviewace.ai' });
  if (!adminExists) {
    await User.create({
      name: 'Admin',
      email: 'admin@interviewace.ai',
      password: 'Admin@123',
      role: 'admin',
    });
    console.log('✅ Created admin user: admin@interviewace.ai / Admin@123');
  }

  // Create a demo user
  const demoExists = await User.findOne({ email: 'demo@interviewace.ai' });
  if (!demoExists) {
    await User.create({
      name: 'Demo User',
      email: 'demo@interviewace.ai',
      password: 'Demo@123',
      targetRole: 'Software Engineer',
      experienceLevel: 'mid',
    });
    console.log('✅ Created demo user: demo@interviewace.ai / Demo@123');
  }

  console.log('\n🎉 Seeding complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
