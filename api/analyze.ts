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
        const { problem } = req.body;
        try {
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

          const content = completion.choices[0]?.message?.content ?? undefined;
          const data = JSON.parse(content || "{}");
          
          if (!data.prerequisites || !Array.isArray(data.prerequisites)) {
            console.warn("[SERVERLESS] Groq returned invalid prerequisites format, fixing...");
            data.prerequisites = [];
          }
          
          if (!data.similarSolution || !Array.isArray(data.similarSolution)) {
            console.warn("[SERVERLESS] Groq returned invalid similarSolution format, fixing...");
            data.similarSolution = [];
          }
          
          res.status(200).json(data);
          resolve();
        } catch (error: any) {
          console.error("[SERVERLESS] Analyze Error:", error);
          if (error.status === 401) {
            res.status(401).json({ error: "Invalid Groq API Key. Please check your key in the Secrets panel." });
          } else {
            res.status(500).json({ error: error.message || "An error occurred during analysis." });
          }
          resolve();
        }
      });
    });
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
