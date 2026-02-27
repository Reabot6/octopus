import express from "express";
import { createServer as createViteServer } from "vite";
import Groq from "groq-sdk";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

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
      if (!apiKey || apiKey === "MY_GROQ_API_KEY") {
        throw new Error("GROQ_API_KEY is missing in environment secrets.");
      }
      groqClient = new Groq({ apiKey });
    }
    return groqClient;
  };

  app.post("/api/analyze", async (req, res) => {
    console.log("[API] Received analyze request");
    const { problem } = req.body;
    try {
      const groq = getGroqClient();
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
      console.error("[API] Analyze Error:", error);
      res.status(500).json({ error: error.message });
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
      res.json(JSON.parse(content || "{}"));
    } catch (error: any) {
      console.error("[API] Teach Error:", error);
      res.status(500).json({ error: error.message });
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
