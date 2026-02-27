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
        const currentUserId = (req as any).user.id;

        try {
          const { count, error } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', currentUserId)
            .eq('is_read', false);

          if (error) throw error;

          res.status(200).json({ count: count || 0 });
          resolve();
        } catch (err: any) {
          console.error("[SERVERLESS] Get Unread Count Error:", err);
          res.status(500).json({ error: err.message || "An error occurred while fetching unread count." });
          resolve();
        }
      });
    });
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
