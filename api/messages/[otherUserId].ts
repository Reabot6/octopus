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
        const { otherUserId } = req.query; // Vercel uses req.query for dynamic routes
        const currentUserId = (req as any).user.id;

        try {
          const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .or(`(sender_id.eq.${currentUserId},and(receiver_id.eq.${otherUserId})),(sender_id.eq.${otherUserId},and(receiver_id.eq.${currentUserId}))`)
            .order('created_at', { ascending: true });

          if (error) throw error;

          // Mark messages as read
          const { error: updateError } = await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('receiver_id', currentUserId)
            .eq('sender_id', otherUserId);

          if (updateError) throw updateError;

          res.status(200).json(messages);
          resolve();
        } catch (err: any) {
          console.error("[SERVERLESS] Get Messages Error:", err);
          res.status(500).json({ error: err.message || "An error occurred while fetching messages." });
          resolve();
        }
      });
    });
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
