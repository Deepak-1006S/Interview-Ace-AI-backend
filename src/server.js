import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { initSocket } from './services/socketService.js';
import { connectDB } from './config/database.js';

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
