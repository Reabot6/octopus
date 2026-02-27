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

// In-memory mock for messages
interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

const mockMessages: Message[] = [];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    // Wrap with authenticate middleware
    return new Promise<void>(resolve => {
      authenticate(req, res, async () => {
        const { receiverId, content } = req.body;
        try {
          const newMessage: Message = {
            id: `msg-${Date.now()}`,
            sender_id: (req as any).user.id,
            receiver_id: receiverId,
            content,
            created_at: new Date().toISOString(),
            is_read: false,
          };
          mockMessages.push(newMessage);
          res.status(200).json({ success: true });
          resolve();
        } catch (err: any) {
          console.error("[SERVERLESS] Send Message Error:", err);
          res.status(500).json({ error: err.message || "An error occurred while sending message." });
          resolve();
        }
      });
    });
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
