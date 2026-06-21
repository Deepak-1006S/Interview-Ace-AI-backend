const DEFAULT = 'http://localhost:5173,http://localhost:5174,https://interview-ace-ai-frontend-three.vercel.app';

const raw = process.env.ALLOWED_ORIGINS || DEFAULT;

const parseAllowed = (val) => {
  if (!val) return [];
  if (val.trim() === '*') return ['*'];
  return val
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

export const allowedOrigins = parseAllowed(raw);

export const getCorsOptions = () => {
  // If '*' present, allow all origins
  if (allowedOrigins.includes('*')) {
    return {
      origin: true,
      credentials: true,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['Authorization'],
      optionsSuccessStatus: 204,
    };
  }

  return {
    origin: (origin, cb) => {
      // allow non-browser tools (no origin) and whitelisted origins
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Authorization'],
    optionsSuccessStatus: 204,
  };
};

export default { allowedOrigins, getCorsOptions };
