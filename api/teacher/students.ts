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
        try {
          // Mock students data
          const students = [
            { id: 'student-1', name: 'Alice Smith', email: 'alice@example.com', created_at: '2023-01-15T10:00:00Z' },
            { id: 'student-2', name: 'Bob Johnson', email: 'bob@example.com', created_at: '2023-02-20T11:30:00Z' },
          ];
          res.status(200).json(students);
          resolve();
        } catch (err: any) {
          console.error("[SERVERLESS] Get Students Error:", err);
          res.status(500).json({ error: err.message || "An error occurred while fetching students." });
          resolve();
        }
      });
    });
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
