import Groq from 'groq-sdk';
import { Prerequisite, SolutionStep } from "../types";

let groqClient: Groq | null = null;
const getGroqClient = () => {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey.trim() === "") {
      throw new Error("GROQ_API_KEY is missing. Please add your Groq API key to the Secrets panel in AI Studio.");
    }
    groqClient = new Groq({ apiKey, dangerouslyAllowBrowser: true });
  }
  return groqClient;
};

export const analyzeProblem = async (problem: string, image?: string): Promise<{
  prerequisites: Prerequisite[];
  similarProblem: string;
  similarSolution: SolutionStep[];
}> => {
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
    data.prerequisites = [];
  }
  
  if (!data.similarSolution || !Array.isArray(data.similarSolution)) {
    data.similarSolution = [];
  }
  
  return data;
};

export const teachConcept = async (
  concept: string, 
  history: { role: 'user' | 'model', text: string }[],
): Promise<{ text: string; illustrationPrompt?: string }> => {
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
  
  return data;
};


