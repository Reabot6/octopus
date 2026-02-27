import express from "express";
import { createServer as createViteServer } from "vite";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// API routes for Groq
app.post("/api/analyze", async (req, res) => {
  const { problem } = req.body;
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a math expert. Analyze the problem and return a JSON object with prerequisites (tree structure), a similar problem, and a step-by-step solution for the similar problem. Follow the requested schema strictly.",
        },
        {
          role: "user",
          content: `Analyze this math problem: "${problem}". 
          1. Identify the core concepts (prerequisites) needed to solve it. Organize them in a logical tree structure (max depth 2).
          2. Create a similar but different math problem.
          3. Provide a step-by-step solution for the similar problem, explicitly linking each step to the relevant prerequisite IDs.
          
          Return the result as JSON with keys: prerequisites, similarProblem, similarSolution.`,
        },
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    res.json(JSON.parse(content || "{}"));
  } catch (error: any) {
    console.error("Groq Analysis Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/teach", async (req, res) => {
  const { concept, history } = req.body;
  try {
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
    res.json(JSON.parse(content || "{}"));
  } catch (error: any) {
    console.error("Groq Teaching Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static("dist"));
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
