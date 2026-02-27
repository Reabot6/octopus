-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('individual', 'student', 'teacher')),
  teacher_id UUID REFERENCES users(id),
  teacher_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create messages table
CREATE TABLE messages (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  sender_id UUID NOT NULL REFERENCES users(id),
  receiver_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create student_activities table
CREATE TABLE student_activities (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  student_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  problem_text TEXT,
  concept_label TEXT,
  duration_seconds INTEGER,
  score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create problem_of_the_week table
CREATE TABLE problem_of_the_week (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  teacher_id UUID NOT NULL REFERENCES users(id) UNIQUE,
  problem_text TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create badges table
CREATE TABLE badges (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL
);

-- Create user_badges table (join table)
CREATE TABLE user_badges (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES users(id),
  badge_id BIGINT NOT NULL REFERENCES badges(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Function to handle new user setup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into our public users table
  INSERT INTO public.users (id, email, name, role, teacher_code)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'role', 
          CASE WHEN NEW.raw_user_meta_data->>'role' = 'teacher' THEN 'OCTO-' || substr(md5(random()::text), 0, 6) ELSE NULL END);

  -- If the new user is a student with a teacher code, link them to the teacher
  IF NEW.raw_user_meta_data->>'role' = 'student' AND NEW.raw_user_meta_data->>'teacher_code' IS NOT NULL THEN
    UPDATE public.users
    SET teacher_id = (SELECT id FROM public.users WHERE teacher_code = NEW.raw_user_meta_data->>'teacher_code' AND role = 'teacher')
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_of_the_week ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Policies for users table
CREATE POLICY "Users can see their own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (auth.uid() = id);

-- Policies for messages table
CREATE POLICY "Users can see their own messages" ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Policies for student_activities table
CREATE POLICY "Students can see their own activities" ON student_activities FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Teachers can see their students' activities" ON student_activities FOR SELECT USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'teacher' AND
  student_id IN (SELECT id FROM users WHERE teacher_id = auth.uid())
);
CREATE POLICY "Students can create their own activities" ON student_activities FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Policies for problem_of_the_week table
CREATE POLICY "Teachers can manage their own problem of the week" ON problem_of_the_week FOR ALL USING (auth.uid() = teacher_id);
CREATE POLICY "Students can see their teacher's problem of the week" ON problem_of_the_week FOR SELECT USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'student' AND
  teacher_id = (SELECT teacher_id FROM users WHERE id = auth.uid())
);

-- Policies for badges and user_badges tables
CREATE POLICY "All users can see all badges" ON badges FOR SELECT USING (true);
CREATE POLICY "Users can see their own earned badges" ON user_badges FOR SELECT USING (auth.uid() = user_id);
