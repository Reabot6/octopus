import express from 'express';
import { createServer as createViteServer } from 'vite';

// Import all serverless function handlers
import analyzeHandler from './api/analyze';
import loginHandler from './api/auth/login';
import signupHandler from './api/auth/signup';
import messagesOtherUserIdHandler from './api/messages/[otherUserId]';
import messagesSendHandler from './api/messages/send';
import messagesUnreadCountHandler from './api/messages/unread/count';
import quizGenerateHandler from './api/quiz/generate';
import teachHandler from './api/teach';
import teacherProblemOfTheWeekHandler from './api/teacher/problem-of-the-week';
import teacherStudentIdHandler from './api/teacher/student/[id]';
import teacherStudentsHandler from './api/teacher/students';
import teacherSummaryHandler from './api/teacher/summary';

async function createServer() {
  const app = express();

  // Middleware to parse JSON bodies
  app.use(express.json());

  // API routes
  app.all('/api/analyze', analyzeHandler);
  app.all('/api/auth/login', loginHandler);
  app.all('/api/auth/signup', signupHandler);
  app.all('/api/messages/:otherUserId', messagesOtherUserIdHandler);
  app.all('/api/messages/send', messagesSendHandler);
  app.all('/api/messages/unread/count', messagesUnreadCountHandler);
  app.all('/api/quiz/generate', quizGenerateHandler);
  app.all('/api/teach', teachHandler);
  app.all('/api/teacher/problem-of-the-week', teacherProblemOfTheWeekHandler);
  app.all('/api/teacher/student/:id', teacherStudentIdHandler);
  app.all('/api/teacher/students', teacherStudentsHandler);
  app.all('/api/teacher/summary', teacherSummaryHandler);

  // Vite middleware
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });
  app.use(vite.middlewares);

  app.listen(3000, () => {
    console.log('Server listening on http://localhost:3000');
  });
}

createServer();
