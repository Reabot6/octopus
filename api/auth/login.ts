import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || "octopus-secret-key-123";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    const { email, password } = req.body;

    // Simplified logic without Supabase
    // In a real application, you would integrate with a database here.

    if (!email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // Mock user for login (replace with actual database lookup)
      const mockUser = {
        id: 'mock-user-id',
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 10), // Hashed mock password
        name: 'Test User',
        role: 'student',
        teacher_code: null,
        teacher_id: 'mock-teacher-id',
        teacher_name: 'Mock Teacher'
      };

      if (email !== mockUser.email || !(await bcrypt.compare(password, mockUser.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign(
        { 
          id: mockUser.id, 
          email: mockUser.email, 
          role: mockUser.role, 
          name: mockUser.name, 
          teacherId: mockUser.teacher_id 
        },
        JWT_SECRET
      );

      res.status(200).json({
        token,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
          teacherCode: mockUser.teacher_code,
          teacherId: mockUser.teacher_id,
          teacherName: mockUser.teacher_name
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
