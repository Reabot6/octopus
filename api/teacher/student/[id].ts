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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    // Wrap with authenticate middleware
    return new Promise<void>(resolve => {
      authenticate(req, res, async () => {
        if ((req as any).user.role !== 'teacher') return res.status(403).json({ error: "Forbidden" });
        const { id } = req.query; // Vercel uses req.query for dynamic routes
        
        try {
          // Mock student data
          const mockStudent = { id: 'student-1', name: 'Alice Smith', email: 'alice@example.com', created_at: '2023-01-15T10:00:00Z', teacher_id: 'mock-teacher-id' };
          const mockActivities = [
            { id: 'act-1', user_id: 'student-1', type: 'quiz_pass', concept_label: 'Algebra Basics', created_at: '2023-03-01T14:00:00Z', score: 90 },
            { id: 'act-2', user_id: 'student-1', type: 'complete', concept_label: 'Linear Equations', created_at: '2023-03-05T16:00:00Z', score: null },
          ];

          if (id !== mockStudent.id || (req as any).user.id !== 'mock-teacher-id') {
            return res.status(404).json({ error: "Student not found or does not belong to this teacher" });
          }

          res.status(200).json({ student: mockStudent, activities: mockActivities });
          resolve();
        } catch (err: any) {
          console.error("[SERVERLESS] Get Student Details Error:", err);
          res.status(500).json({ error: err.message || "An error occurred while fetching student details." });
          resolve();
        }
      });
    });
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
