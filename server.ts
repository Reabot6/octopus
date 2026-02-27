import express from "express";
import { createServer as createViteServer } from "vite";
import Groq from "groq-sdk";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "./server/db.js";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("[SERVER] Initializing Octopus backend...");

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Logging
  app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  let groqClient: Groq | null = null;
  const getGroqClient = () => {
    if (!groqClient) {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey || apiKey === "MY_GROQ_API_KEY" || apiKey.trim() === "") {
        throw new Error("GROQ_API_KEY is missing. Please add your Groq API key to the Secrets panel in AI Studio.");
      }
      if (!apiKey.startsWith("gsk_")) {
        console.warn("[SERVER] Warning: GROQ_API_KEY does not start with 'gsk_'. It might be invalid.");
      }
      groqClient = new Groq({ apiKey });
    }
    return groqClient;
  };

  const JWT_SECRET = process.env.JWT_SECRET || "octopus-secret-key-123";

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // Auth Routes
  app.post("/api/auth/signup", async (req, res) => {
    const { email, password, name, role, teacherCode } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      let teacherId = null;
      let generatedCode = null;

      if (role === 'teacher') {
        generatedCode = `OCTO-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      } else if (role === 'student' && teacherCode) {
        const teacher = db.prepare("SELECT id FROM users WHERE teacher_code = ?").get(teacherCode) as any;
        if (!teacher) return res.status(400).json({ error: "Invalid teacher code" });
        teacherId = teacher.id;
      }

      const info = db.prepare(
        "INSERT INTO users (email, password, name, role, teacher_code, teacher_id) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(email, hashedPassword, name, role, generatedCode, teacherId);

      const token = jwt.sign({ id: info.lastInsertRowid, email, role, name, teacherId }, JWT_SECRET);
      res.json({ token, user: { id: info.lastInsertRowid, email, name, role, teacherCode: generatedCode, teacherId } });
    } catch (err: any) {
      res.status(400).json({ error: err.message.includes("UNIQUE") ? "Email already exists" : err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = db.prepare(`
        SELECT u.*, t.name as teacher_name 
        FROM users u 
        LEFT JOIN users t ON u.teacher_id = t.id 
        WHERE u.email = ?
      `).get(email) as any;
      
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name, teacherId: user.teacher_id }, JWT_SECRET);
      res.json({ 
        token, 
        user: { 
          id: user.id, 
          email: user.email, 
          name: user.name, 
          role: user.role, 
          teacherCode: user.teacher_code,
          teacherId: user.teacher_id,
          teacherName: user.teacher_name
        } 
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/analyze", async (req, res) => {
    console.log("[API] Received analyze request");
    const { problem, image } = req.body;
    try {
      let content: string | undefined;

      if (image) {
        console.log("[API] Image detected, using Gemini for analysis...");
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const base64Data = image.split(",")[1];
        const mimeType = image.split(";")[0].split(":")[1];

        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: [
            {
              parts: [
                { inlineData: { data: base64Data, mimeType } },
                { text: `Analyze the math problem in this image. If there is also text provided: "${problem}", use it as context.
                
                Return a JSON object following this schema:
                {
                  "prerequisites": [
                    {
                      "id": "string",
                      "label": "string",
                      "description": "string",
                      "children": [
                        { "id": "string", "label": "string", "description": "string" }
                      ]
                    }
                  ],
                  "similarProblem": "string",
                  "similarSolution": [
                    {
                      "step": "string",
                      "explanation": "string",
                      "prerequisiteIds": ["string"]
                    }
                  ]
                }
                
                CRITICAL INSTRUCTIONS:
                1. Identify the core concepts (prerequisites) needed to solve it.
                2. Create a similar but different math problem.
                3. Provide a HIGHLY DETAILED, step-by-step solution for the SIMILAR problem.
                4. Link each step to prerequisite IDs.` }
              ]
            }
          ],
          config: { responseMimeType: "application/json" }
        });
        content = response.text;
      } else {
        const groq = getGroqClient();
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `You are a math expert. Analyze the problem and return a JSON object.
              The JSON MUST follow this schema:
              {
                "prerequisites": [
                  {
                    "id": "string",
                    "label": "string",
                    "description": "string",
                    "children": [
                      { "id": "string", "label": "string", "description": "string" }
                    ]
                  }
                ],
                "similarProblem": "string",
                "similarSolution": [
                  {
                    "step": "string",
                    "explanation": "string",
                    "prerequisiteIds": ["string"]
                  }
                ]
              }`,
            },
            {
              role: "user",
              content: `Analyze this math problem: "${problem}". 
              
              CRITICAL INSTRUCTIONS:
              1. Identify the core concepts (prerequisites) needed to solve it. Organize them in a logical tree structure (max depth 2).
              2. Create a similar but different math problem that uses the same core concepts.
              3. Provide a HIGHLY DETAILED, step-by-step solution for the SIMILAR problem. 
                 - Each step must focus on a single logical move.
                 - The "explanation" for each step must be thorough, explaining the "why" and "how" behind the math.
                 - Explicitly link each step to the relevant prerequisite IDs from your list.
              
              Your goal is to teach the user how to solve the original problem by walking them through a perfectly explained similar example.`,
            },
          ],
          model: "llama-3.3-70b-versatile",
          response_format: { type: "json_object" },
        });
        content = completion.choices[0]?.message?.content;
      }

      console.log("[AI] Raw Response:", content);
      const data = JSON.parse(content || "{}");
      
      // Ensure prerequisites is always an array
      if (!data.prerequisites || !Array.isArray(data.prerequisites)) {
        console.warn("[API] Groq returned invalid prerequisites format, fixing...");
        data.prerequisites = [];
      }
      
      // Ensure similarSolution is always an array
      if (!data.similarSolution || !Array.isArray(data.similarSolution)) {
        console.warn("[API] Groq returned invalid similarSolution format, fixing...");
        data.similarSolution = [];
      }
      
      res.json(data);

      // Log activity if user is authenticated
      const authHeader = req.headers.authorization;
      if (authHeader) {
        try {
          const token = authHeader.split(" ")[1];
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          db.prepare("INSERT INTO activity (user_id, type, problem_text) VALUES (?, ?, ?)").run(decoded.id, 'analyze', problem);
        } catch (e) {}
      }
    } catch (error: any) {
      console.error("[API] Analyze Error:", error);
      if (error.status === 401) {
        res.status(401).json({ error: "Invalid Groq API Key. Please check your key in the Secrets panel." });
      } else {
        res.status(500).json({ error: error.message || "An error occurred during analysis." });
      }
    }
  });

  app.post("/api/teach", async (req, res) => {
    console.log("[API] Received teach request");
    const { concept, history } = req.body;
    try {
      const groq = getGroqClient();
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a helpful math teacher. Use real-world examples and ask for input. Return JSON with 'text' and optional 'illustrationPrompt'.",
          },
          ...history.map((h: any) => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.text })),
          {
            role: "user",
            content: `Explain the concept: "${concept}". Keep it interactive.`,
          },
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      const data = JSON.parse(content || "{}");
      
      // Ensure text exists
      if (!data.text) {
        data.text = "I'm sorry, I couldn't generate an explanation. Please try again.";
      }
      
      res.json(data);

      // Log activity if user is authenticated
      const authHeader = req.headers.authorization;
      if (authHeader) {
        try {
          const token = authHeader.split(" ")[1];
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          db.prepare("INSERT INTO activity (user_id, type, concept_label) VALUES (?, ?, ?)").run(decoded.id, 'learn', concept);
        } catch (e) {}
      }
    } catch (error: any) {
      console.error("[API] Teach Error:", error);
      if (error.status === 401) {
        res.status(401).json({ error: "Invalid Groq API Key. Please check your key in the Secrets panel." });
      } else {
        res.status(500).json({ error: error.message || "An error occurred during teaching session." });
      }
    }
  });

  // Teacher Dashboard Routes
  app.get("/api/teacher/students", authenticate, (req: any, res) => {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: "Forbidden" });
    const students = db.prepare(`
      SELECT id, name, email, created_at 
      FROM users 
      WHERE teacher_id = ?
    `).all(req.user.id);
    res.json(students);
  });

  app.get("/api/teacher/student/:id", authenticate, (req: any, res) => {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: "Forbidden" });
    const studentId = req.params.id;
    
    // Verify student belongs to this teacher
    const student = db.prepare("SELECT * FROM users WHERE id = ? AND teacher_id = ?").get(studentId, req.user.id);
    if (!student) return res.status(404).json({ error: "Student not found" });

    const activities = db.prepare(`
      SELECT * FROM activity 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).all(studentId);

    res.json({ student, activities });
  });

  app.post("/api/quiz/generate", authenticate, async (req: any, res) => {
    const { concept } = req.body;
    try {
      const groq = getGroqClient();
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a math teacher. Generate 3 multiple-choice questions to test understanding of a concept. Return JSON.",
          },
          {
            role: "user",
            content: `Generate a quiz for the concept: "${concept}". 
            Return JSON schema:
            {
              "questions": [
                {
                  "question": "string",
                  "options": ["string", "string", "string", "string"],
                  "correctIndex": number,
                  "explanation": "string"
                }
              ]
            }`,
          },
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      res.json(JSON.parse(content || "{}"));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/activity/log", authenticate, (req: any, res) => {
    const { type, problem_text, concept_label, duration_seconds, score } = req.body;
    try {
      db.prepare(`
        INSERT INTO activity (user_id, type, problem_text, concept_label, duration_seconds, score)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(req.user.id, type, problem_text, concept_label, duration_seconds || 0, score || null);

      // Check for new badges
      const userActivity = db.prepare('SELECT COUNT(*) as count FROM activity WHERE user_id = ?').get(req.user.id) as any;
      const masteredConcepts = db.prepare("SELECT COUNT(DISTINCT concept_label) as count FROM activity WHERE user_id = ? AND (type = 'complete' OR type = 'quiz_pass')").get(req.user.id) as any;

      const availableBadges = db.prepare('SELECT * FROM badges').all() as any[];
      const earnedBadges = db.prepare('SELECT badge_id FROM user_badges WHERE user_id = ?').all(req.user.id) as any[];
      const earnedIds = earnedBadges.map(b => b.badge_id);

      const newlyEarned = [];
      for (const badge of availableBadges) {
        if (earnedIds.includes(badge.id)) continue;

        let earned = false;
        if (badge.requirement_type === 'problems_solved' && userActivity.count >= badge.requirement_count) {
          earned = true;
        } else if (badge.requirement_type === 'concepts_mastered' && masteredConcepts.count >= badge.requirement_count) {
          earned = true;
        }

        if (earned) {
          db.prepare('INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)').run(req.user.id, badge.id);
          newlyEarned.push(badge);
        }
      }

      res.json({ success: true, newlyEarned });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/user/badges", authenticate, (req: any, res) => {
    try {
      const badges = db.prepare(`
        SELECT b.*, ub.earned_at 
        FROM badges b 
        JOIN user_badges ub ON b.id = ub.badge_id 
        WHERE ub.user_id = ?
      `).all(req.user.id);
      res.json(badges);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/activity/complete", authenticate, (req: any, res) => {
    const { conceptLabel } = req.body;
    try {
      db.prepare("INSERT INTO activity (user_id, type, concept_label) VALUES (?, ?, ?)").run(req.user.id, 'complete', conceptLabel);
      res.json({ status: "ok" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/teacher/heatmap", authenticate, (req: any, res) => {
    try {
      const heatmap = db.prepare(`
        SELECT concept_label, 
               COUNT(*) as total_attempts,
               SUM(CASE WHEN type = 'quiz_fail' THEN 1 ELSE 0 END) as failures
        FROM activity a
        JOIN users u ON a.user_id = u.id
        WHERE u.teacher_id = ? AND concept_label IS NOT NULL
        GROUP BY concept_label
      `).all(req.user.id);
      res.json(heatmap);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/teacher/summary", authenticate, async (req: any, res) => {
    try {
      const students = db.prepare('SELECT id, name FROM users WHERE teacher_id = ?').all(req.user.id) as any[];
      if (students.length === 0) return res.json({ summary: "You haven't linked any students yet. Share your teacher code to get started!" });

      const recentActivity = db.prepare(`
        SELECT u.name, a.type, a.concept_label, a.created_at, a.score
        FROM activity a
        JOIN users u ON a.user_id = u.id
        WHERE u.teacher_id = ?
        ORDER BY a.created_at DESC
        LIMIT 30
      `).all(req.user.id);

      const groq = getGroqClient();
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are Octopus Insight, a highly experienced and empathetic educational consultant. 
            Your goal is to provide actionable, human-sounding insights to a teacher about their classroom.
            
            GUIDELINES:
            - DO NOT sound like a generic AI. Be warm, professional, and specific.
            - Focus on CONCEPTS. If students are struggling with "Quadratic Equations", mention it by name.
            - Identify patterns. Are multiple students failing quizzes on the same topic?
            - Give specific advice: "It might be worth doing a quick review of [Concept] in your next session."
            - Use the student names provided to make it feel personalized.
            - If data is sparse, encourage the teacher on how to get more (e.g., "Encourage students to try the quizzes!").
            - Keep it under 150 words.`,
          },
          {
            role: "user",
            content: `Here is the recent activity for my class: ${JSON.stringify(recentActivity)}. 
            What are your observations and recommendations for me today?`,
          },
        ],
        model: "llama-3.3-70b-versatile",
      });

      res.json({ summary: completion.choices[0]?.message?.content });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Problem of the Week
  app.post("/api/teacher/problem-of-the-week", authenticate, (req: any, res) => {
    const { problemText } = req.body;
    try {
      db.prepare(`
        INSERT INTO problem_of_the_week (teacher_id, problem_text, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(teacher_id) DO UPDATE SET problem_text = excluded.problem_text, updated_at = CURRENT_TIMESTAMP
      `).run(req.user.id, problemText);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/student/problem-of-the-week", authenticate, (req: any, res) => {
    try {
      const user = db.prepare('SELECT teacher_id FROM users WHERE id = ?').get(req.user.id) as any;
      if (!user?.teacher_id) return res.json({ problem: null });

      const pow = db.prepare('SELECT problem_text FROM problem_of_the_week WHERE teacher_id = ?').get(user.teacher_id) as any;
      res.json({ problem: pow?.problem_text || null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Messaging
  app.post("/api/messages/send", authenticate, (req: any, res) => {
    const { receiverId, content } = req.body;
    try {
      db.prepare('INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)').run(req.user.id, receiverId, content);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/messages/:otherUserId", authenticate, (req: any, res) => {
    const { otherUserId } = req.params;
    try {
      const messages = db.prepare(`
        SELECT * FROM messages 
        WHERE (sender_id = ? AND receiver_id = ?) 
           OR (sender_id = ? AND receiver_id = ?)
        ORDER BY created_at ASC
      `).all(req.user.id, otherUserId, otherUserId, req.user.id);
      
      // Mark as read
      db.prepare('UPDATE messages SET is_read = 1 WHERE receiver_id = ? AND sender_id = ?').run(req.user.id, otherUserId);
      
      res.json(messages);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/messages/unread/count", authenticate, (req: any, res) => {
    try {
      const count = db.prepare('SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0').get(req.user.id) as any;
      res.json({ count: count.count });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("[SERVER] Starting Vite in middleware mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("[SERVER] Serving static files from dist...");
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Octopus backend running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("[SERVER] Failed to start server:", err);
});
