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
  if (req.method === 'POST') {
    // Wrap with authenticate middleware
    return new Promise<void>(resolve => {
      authenticate(req, res, async () => {
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
          
          if (!data.text) {
            data.text = "I'm sorry, I couldn't generate an explanation. Please try again.";
          }
          
          res.status(200).json(data);
          resolve();
        } catch (error: any) {
          console.error("[SERVERLESS] Teach Error:", error);
          if (error.status === 401) {
            res.status(401).json({ error: "Invalid Groq API Key. Please check your key in the Secrets panel." });
          } else {
            res.status(500).json({ error: error.message || "An error occurred during teaching session." });
          }
          resolve();
        }
      });
    });
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
