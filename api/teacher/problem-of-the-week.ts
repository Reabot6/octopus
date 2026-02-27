import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { supabase } from '../../src/lib/supabaseClient';

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
  // Wrap with authenticate middleware
  return new Promise<void>(resolve => {
    authenticate(req, res, async () => {
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;

      if (req.method === 'POST') {
        if (userRole !== 'teacher') return res.status(403).json({ error: "Forbidden" });
        const { problemText } = req.body;
        try {
          const { error } = await supabase
            .from('problem_of_the_week')
            .upsert({ teacher_id: userId, problem_text: problemText, updated_at: new Date().toISOString() }, { onConflict: 'teacher_id' });

          if (error) throw error;

          res.status(200).json({ success: true });
          resolve();
        } catch (err: any) {
          console.error("[SERVERLESS] Set Problem of the Week Error:", err);
          res.status(500).json({ error: err.message || "An error occurred while setting the problem." });
          resolve();
        }
      } else if (req.method === 'GET') {
        try {
          let teacherId = userId;
          if (userRole === 'student') {
            teacherId = (req as any).user.teacherId;
          }

          const { data, error } = await supabase
            .from('problem_of_the_week')
            .select('problem_text')
            .eq('teacher_id', teacherId)
            .single();

          if (error && error.code !== 'PGRST116') throw error; // Ignore 'not found' error

          res.status(200).json({ problem: data?.problem_text || null });
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
