import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import Groq from 'groq-sdk';

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

let groqClient: Groq | null = null;
const getGroqClient = () => {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === "MY_GROQ_API_KEY" || apiKey.trim() === "") {
      throw new Error("GROQ_API_KEY is missing. Please add your Groq API key to the Secrets panel in AI Studio.");
    }
    if (!apiKey.startsWith("gsk_")) {
      console.warn("[SERVERLESS] Warning: GROQ_API_KEY does not start with 'gsk_'. It might be invalid.");
    }
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    // Wrap with authenticate middleware
    return new Promise<void>(resolve => {
      authenticate(req, res, async () => {
        try {
          // Mock students data
          const students = [
            { id: 'student-1', name: 'Alice Smith' },
            { id: 'student-2', name: 'Bob Johnson' },
          ];

          if (students.length === 0) return res.status(200).json({ summary: "You haven't linked any students yet. Share your teacher code to get started!" });

          // Mock recent activity data
          const recentActivity = [
            { name: 'Alice Smith', type: 'quiz_pass', concept_label: 'Algebra Basics', created_at: '2023-03-01T14:00:00Z', score: 90 },
            { name: 'Bob Johnson', type: 'complete', concept_label: 'Linear Equations', created_at: '2023-03-05T16:00:00Z', score: null },
            { name: 'Alice Smith', type: 'analyze', concept_label: null, created_at: '2023-03-07T10:00:00Z', score: null },
          ];

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
                - Keep it under 150 words.
                
                Here is the recent activity data for your students: ${JSON.stringify(recentActivity)}`,
              },
            ],
            model: "llama-3.3-70b-versatile",
          });

          const summary = completion.choices[0]?.message?.content || "No insights available.";
          res.status(200).json({ summary });
          resolve();
        } catch (err: any) {
          console.error("[SERVERLESS] Teacher Summary Error:", err);
          res.status(500).json({ error: err.message || "An error occurred while generating summary." });
          resolve();
        }
      });
    });
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
