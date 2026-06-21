import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { initSocket } from './services/socketService.js';
import { connectDB } from './config/database.js';

// ─── Validate Required Environment Variables ───────────────────────────────
const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
];

if (!process.env.ANTHROPIC_API_KEY || /^your-anthropic-api-key/i.test(process.env.ANTHROPIC_API_KEY.trim())) {
  console.warn(
    '⚠️  ANTHROPIC_API_KEY is missing or still a placeholder.\n' +
    '   AI features will use built-in questions and basic feedback.\n' +
    '   Set a valid key in Backend/.env from https://console.anthropic.com/account/keys\n'
  );
}

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(
    '❌ Missing required environment variables:\n' +
    missingVars.map((v) => `   - ${v}`).join('\n') +
    '\n\n   Please add them to your .env file'
  );
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Connect to MongoDB then start server
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`\n🚀 InterviewAce AI Backend`);
      console.log(`   Server  : http://localhost:${PORT}`);
      console.log(`   API     : http://localhost:${PORT}/api/v1`);
      console.log(`   Env     : ${process.env.NODE_ENV || 'development'}\n`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => process.exit(0));
});
