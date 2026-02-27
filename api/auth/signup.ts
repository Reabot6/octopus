import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../../src/lib/supabaseClient';

const JWT_SECRET = process.env.JWT_SECRET || "octopus-secret-key-123";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    const { email, password, name, role, teacherCode } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const { data: existingUser, error: existingUserError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      let teacherId = null;
      if (role === 'student' && teacherCode) {
        const { data: teacher, error: teacherError } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'teacher')
          .eq('teacher_code', teacherCode)
          .single();

        if (teacherError || !teacher) {
          return res.status(400).json({ error: 'Invalid teacher code' });
        }
        teacherId = teacher.id;
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([{ email, password_hash: hashedPassword, role, name, teacher_id: teacherId }])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      if (role === 'student') {
        const { error: studentInsertError } = await supabase
          .from('students')
          .insert([{ user_id: newUser.id, teacher_id: teacherId }]);

        if (studentInsertError) {
          throw studentInsertError;
        }
      }

      const token = jwt.sign({ id: newUser.id, email, role, name, teacherId }, JWT_SECRET);
      res.status(200).json({ token, user: { id: newUser.id, email, name, role, teacherId } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
