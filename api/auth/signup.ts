import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || "octopus-secret-key-123";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    const { email, password, name, role, teacherCode } = req.body;

    // Simplified logic without Supabase
    // In a real application, you would integrate with a database here.

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      let teacherId = null;
      let generatedCode = null;

      if (role === 'teacher') {
        generatedCode = `OCTO-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      } else if (role === 'student' && teacherCode) {
        // Mock teacher code validation
        if (teacherCode !== 'OCTO-MOCK') {
          return res.status(400).json({ error: "Invalid teacher code" });
        }
        teacherId = 'mock-teacher-id';
      }

      // Mock user creation
      const newUser = { id: `user-${Date.now()}`, email, name, role, teacher_code: generatedCode, teacher_id: teacherId };

      const token = jwt.sign({ id: newUser.id, email, role, name, teacherId }, JWT_SECRET);
      res.status(200).json({ token, user: { id: newUser.id, email, name, role, teacherCode: generatedCode, teacherId } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
