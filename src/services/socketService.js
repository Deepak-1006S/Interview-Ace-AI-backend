import { Server } from 'socket.io';
import { verifyToken } from '../utils/jwt.js';
import User from '../models/User.js';
import { streamFeedback } from './aiService.js';
import { allowedOrigins } from '../config/cors.js';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: allowedOrigins.includes('*') ? true : allowedOrigins,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Auth middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) return next(new Error('Authentication required'));

      const decoded = verifyToken(token);
      const user = await User.findById(decoded.sub).select('_id name email');
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    socket.join(`user:${userId}`);

    console.log(`🔌 Socket connected: ${socket.user.name} (${socket.id})`);

    // ── Join an interview room ───────────────────────────────────────────────
    socket.on('interview:join', (interviewId) => {
      socket.join(`interview:${interviewId}`);
      socket.emit('interview:joined', { interviewId });
    });

    // ── Real-time answer streaming feedback ──────────────────────────────────
    socket.on('answer:stream-feedback', async ({ question, answer, type, interviewId }) => {
      if (!answer?.trim()) {
        socket.emit('feedback:error', { message: 'No answer provided' });
        return;
      }

      socket.emit('feedback:start');
      try {
        await streamFeedback({
          question,
          answer,
          type,
          onChunk: (text) => {
            socket.emit('feedback:chunk', { text });
          },
        });
        socket.emit('feedback:complete');
      } catch (err) {
        console.error('Stream feedback error:', err.message);
        socket.emit('feedback:error', { message: 'Failed to generate feedback' });
      }
    });

    // ── Typing indicator (user is typing their answer) ───────────────────────
    socket.on('answer:typing', ({ interviewId }) => {
      socket.to(`interview:${interviewId}`).emit('answer:user-typing', {
        userId,
        name: socket.user.name,
      });
    });

    // ── Interview timer events ────────────────────────────────────────────────
    socket.on('timer:update', ({ interviewId, timeRemaining }) => {
      io.to(`interview:${interviewId}`).emit('timer:tick', { timeRemaining });
    });

    // ── Leave interview room ──────────────────────────────────────────────────
    socket.on('interview:leave', (interviewId) => {
      socket.leave(`interview:${interviewId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.user.name} (${socket.id})`);
    });
  });

  console.log('✅ Socket.io initialized');
  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

// Emit event to a specific user
export const emitToUser = (userId, event, data) => {
  if (io) io.to(`user:${userId}`).emit(event, data);
};
