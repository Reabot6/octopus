import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || "octopus-secret-key-123";

// Mock authenticate middleware for serverless functions
const authenticate = (req: VercelRequest, res: VercelResponse, next: Function) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// In-memory mock for Problem of the Week storage
let mockProblemOfTheWeek: { [teacherId: string]: { problem_text: string, updated_at: string } } = {};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Wrap with authenticate middleware
  return new Promise<void>(resolve => {
    authenticate(req, res, async () => {
      const teacherId = (req as any).user.id;

      if (req.method === 'POST') {
        if ((req as any).user.role !== 'teacher') return res.status(403).json({ error: "Forbidden" });
        const { problemText } = req.body;
        try {
          mockProblemOfTheWeek[teacherId] = { problem_text: problemText, updated_at: new Date().toISOString() };
          res.status(200).json({ success: true });
          resolve();
        } catch (err: any) {
          console.error("[SERVERLESS] Set Problem of the Week Error:", err);
          res.status(500).json({ error: err.message || "An error occurred while setting the problem." });
          resolve();
        }
      } else if (req.method === 'GET') {
        try {
          // For students, fetch their teacher's problem
          const userRole = (req as any).user.role;
          let targetTeacherId = teacherId;

          if (userRole === 'student') {
            // Mock: assume student has a teacher_id
            targetTeacherId = (req as any).user.teacherId || 'mock-teacher-id'; 
          }

          const problem = mockProblemOfTheWeek[targetTeacherId];
          res.status(200).json({ problem: problem?.problem_text || null });
          resolve();
        } catch (err: any) {
          console.error("[SERVERLESS] Get Problem of the Week Error:", err);
          res.status(500).json({ error: err.message || "An error occurred while fetching the problem." });
          resolve();
        }
      } else {
        res.status(405).json({ error: 'Method Not Allowed' });
        resolve();
      }
    });
  });
}
