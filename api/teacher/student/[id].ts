import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { supabase } from '../../../src/lib/supabaseClient';

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
        const teacherId = (req as any).user.id;
        
        try {
          const { data: student, error: studentError } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .eq('teacher_id', teacherId)
            .single();

          if (studentError || !student) {
            return res.status(404).json({ error: "Student not found or does not belong to this teacher" });
          }

          const { data: activities, error: activitiesError } = await supabase
            .from('student_activities')
            .select('*')
            .eq('student_id', id);

          if (activitiesError) {
            throw activitiesError;
          }

          res.status(200).json({ student, activities });
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
