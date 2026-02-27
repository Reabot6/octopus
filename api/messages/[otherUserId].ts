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

// In-memory mock for messages (same as in send.ts for consistency)
interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

const mockMessages: Message[] = []; // This will be empty on each function invocation, so it's not truly persistent.
                                    // For a real serverless app, you'd use a persistent store like a database.

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    // Wrap with authenticate middleware
    return new Promise<void>(resolve => {
      authenticate(req, res, async () => {
        const { otherUserId } = req.query; // Vercel uses req.query for dynamic routes
        const currentUserId = (req as any).user.id;

        try {
          // Mock fetching messages
          const messages = mockMessages.filter(
            msg => (msg.sender_id === currentUserId && msg.receiver_id === otherUserId) ||
                   (msg.sender_id === otherUserId && msg.receiver_id === currentUserId)
          ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

          // Mock marking as read (only for messages received by current user from other user)
          messages.forEach(msg => {
            if (msg.receiver_id === currentUserId && msg.sender_id === otherUserId) {
              msg.is_read = true;
            }
          });
          
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
