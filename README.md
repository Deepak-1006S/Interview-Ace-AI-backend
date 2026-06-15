# InterviewAce AI — Backend API

A production-ready Node.js/Express backend with Socket.io, MongoDB, JWT auth, and Claude AI integration.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ (ESM) |
| Framework | Express 4 |
| Database | MongoDB + Mongoose |
| Auth | JWT (access + refresh tokens) |
| Real-time | Socket.io 4 |
| AI | Anthropic Claude (claude-sonnet-4-6) |
| Validation | express-validator |
| Security | helmet, cors, express-rate-limit |

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/interviewace
JWT_SECRET=your-long-random-secret-here
ANTHROPIC_API_KEY=sk-ant-...
ALLOWED_ORIGINS=http://localhost:5173
```

### 3. Seed the database (optional but recommended)
```bash
npm run seed
```

This creates:
- 17 sample interview questions across all types
- Admin account: `admin@interviewace.ai` / `Admin@123`
- Demo account: `demo@interviewace.ai` / `Demo@123`

### 4. Start the server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server runs at `http://localhost:5000`

---

## API Reference

### Base URL
```
http://localhost:5000/api/v1
```

### Health Check
```
GET /health
```

---

### 🔐 Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Register new user |
| POST | `/auth/login` | No | Login |
| POST | `/auth/refresh` | No | Refresh access token |
| POST | `/auth/logout` | ✅ | Logout |
| GET | `/auth/me` | ✅ | Get current user |

**Register body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "secret123",
  "targetRole": "Frontend Engineer",
  "experienceLevel": "mid"
}
```

**Login response:**
```json
{
  "success": true,
  "data": {
    "user": { "_id": "...", "name": "Jane", "stats": {...} },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

All protected routes require:
```
Authorization: Bearer <accessToken>
```

---

### 🎤 Interviews

| Method | Endpoint | Description |
|---|---|---|
| POST | `/interviews` | Start a new interview |
| GET | `/interviews` | List user's interviews |
| GET | `/interviews/:id` | Get interview details |
| POST | `/interviews/:id/answer` | Submit an answer (gets AI feedback) |
| POST | `/interviews/:id/skip` | Skip current question |
| POST | `/interviews/:id/complete` | Complete interview (gets summary) |
| DELETE | `/interviews/:id` | Delete interview |

**Create Interview:**
```json
{
  "type": "behavioral",
  "difficulty": "medium",
  "targetRole": "Software Engineer",
  "targetCompany": "Google",
  "questionCount": 5
}
```

Types: `behavioral | technical | coding | system-design | mixed | hr`

**Submit Answer:**
```json
{
  "questionIndex": 0,
  "answer": "In my previous role at...",
  "codeAnswer": "function twoSum(nums, target) {...}",
  "language": "javascript",
  "timeSpent": 95
}
```

**Answer response includes AI feedback:**
```json
{
  "feedback": {
    "score": 82,
    "strengths": ["Clear structure", "Used STAR method"],
    "improvements": ["Add quantifiable results"],
    "detailedFeedback": "Your answer demonstrated...",
    "sampleAnswer": "A strong answer would...",
    "keywords": ["STAR", "impact", "metrics"],
    "followUpQuestions": ["What was the outcome?"]
  }
}
```

---

### ❓ Questions

| Method | Endpoint | Description |
|---|---|---|
| GET | `/questions` | List questions (filterable) |
| GET | `/questions/random` | Get random questions |
| GET | `/questions/:id` | Get single question |
| POST | `/questions/generate` | AI-generate questions |

**Query params for GET /questions:**
- `type`, `difficulty`, `category`, `tag`, `role`, `page`, `limit`

**Generate questions:**
```json
{
  "type": "coding",
  "difficulty": "hard",
  "role": "Backend Engineer",
  "company": "Amazon",
  "count": 5
}
```

---

### 📊 Analytics

| Method | Endpoint | Description |
|---|---|---|
| GET | `/analytics/dashboard` | Full dashboard data |
| GET | `/analytics/performance` | Performance over time |
| GET | `/analytics/leaderboard` | Top users |

**Dashboard response includes:**
- User stats (total interviews, avg score, streak, best score)
- Recent 5 interviews
- Score breakdown by type and difficulty
- Weekly activity (last 7 days)
- Score trend (last 10 interviews)

---

### 💬 Feedback

| Method | Endpoint | Description |
|---|---|---|
| POST | `/feedback/evaluate` | Evaluate a single answer |
| POST | `/feedback/follow-up` | Generate a follow-up question |

---

### 👤 Users

| Method | Endpoint | Description |
|---|---|---|
| GET | `/users/profile` | Get profile |
| PUT | `/users/profile` | Update profile |
| PUT | `/users/password` | Change password |
| DELETE | `/users/account` | Deactivate account |

---

## 🔌 Socket.io Events

Connect with your JWT token:
```javascript
const socket = io('http://localhost:5000', {
  auth: { token: accessToken }
});
```

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `interview:join` | `interviewId` | Join an interview room |
| `answer:stream-feedback` | `{ question, answer, type, interviewId }` | Stream real-time feedback |
| `answer:typing` | `{ interviewId }` | Notify typing |
| `timer:update` | `{ interviewId, timeRemaining }` | Sync timer |
| `interview:leave` | `interviewId` | Leave room |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `interview:joined` | `{ interviewId }` | Confirmation |
| `feedback:start` | — | Feedback streaming started |
| `feedback:chunk` | `{ text }` | Streamed feedback text chunk |
| `feedback:complete` | — | Streaming done |
| `feedback:error` | `{ message }` | Error occurred |
| `timer:tick` | `{ timeRemaining }` | Timer sync |

**Real-time feedback example:**
```javascript
socket.emit('answer:stream-feedback', {
  question: 'Tell me about yourself',
  answer: 'I am a software engineer...',
  type: 'behavioral',
  interviewId: '...'
});

socket.on('feedback:chunk', ({ text }) => {
  setFeedback(prev => prev + text);
});

socket.on('feedback:complete', () => {
  console.log('Done!');
});
```

---

## Deployment (Render)

1. Create a new **Web Service** on Render
2. Connect your GitHub repo
3. Set environment variables in Render dashboard
4. Build command: `npm install`
5. Start command: `npm start`

Your backend will be available at `https://your-app.onrender.com`

Update your frontend `.env`:
```
VITE_API_URL=https://your-app.onrender.com
```

---

## Project Structure

```
src/
├── server.js           # Entry point
├── app.js              # Express app + middleware
├── config/
│   └── database.js     # MongoDB connection
├── controllers/
│   ├── authController.js
│   ├── interviewController.js
│   ├── questionController.js
│   ├── analyticsController.js
│   ├── feedbackController.js
│   └── userController.js
├── middleware/
│   ├── auth.js         # JWT protect middleware
│   ├── errorHandler.js
│   ├── notFound.js
│   └── validate.js
├── models/
│   ├── User.js
│   ├── Interview.js
│   └── Question.js
├── routes/
│   ├── auth.js
│   ├── interviews.js
│   ├── questions.js
│   ├── analytics.js
│   ├── feedback.js
│   └── users.js
├── services/
│   ├── aiService.js    # Anthropic Claude integration
│   └── socketService.js # Socket.io + real-time streaming
└── utils/
    ├── jwt.js
    ├── response.js
    └── seed.js
```
