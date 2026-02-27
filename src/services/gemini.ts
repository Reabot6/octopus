import { GoogleGenAI } from "@google/genai";
import { Prerequisite, SolutionStep } from "../types";

const getGeminiApiKey = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "MY_GEMINI_API_KEY") {
    // We only throw if we're actually trying to use Gemini (for images)
    return null;
  }
  return key;
};

export const analyzeProblem = async (problem: string, token?: string | null, image?: string): Promise<{
  prerequisites: Prerequisite[];
  similarProblem: string;
  similarSolution: SolutionStep[];
}> => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch("/api/analyze", {
    method: "POST",
    headers,
    body: JSON.stringify({ problem, image }),
  });

  if (!response.ok) {
    let errorMessage = "Failed to analyze problem";
    try {
      const err = await response.json();
      errorMessage = err.error || errorMessage;
    } catch (e) {
      const text = await response.text();
      console.error("Non-JSON error response:", text);
      errorMessage = `Server Error (${response.status}): ${text.slice(0, 100)}...`;
    }
    throw new Error(errorMessage);
  }

  return response.json();
};

export const teachConcept = async (
  concept: string, 
  history: { role: 'user' | 'model', text: string }[],
  token?: string | null
): Promise<{ text: string; illustrationPrompt?: string }> => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch("/api/teach", {
    method: "POST",
    headers,
    body: JSON.stringify({ concept, history }),
  });

  if (!response.ok) {
    let errorMessage = "Failed to teach concept";
    try {
      const err = await response.json();
      errorMessage = err.error || errorMessage;
    } catch (e) {
      const text = await response.text();
      console.error("Non-JSON error response:", text);
      errorMessage = `Server Error (${response.status}): ${text.slice(0, 100)}...`;
    }
    throw new Error(errorMessage);
  }

  return response.json();
};

export const generateIllustration = async (prompt: string): Promise<string | undefined> => {
  const key = getGeminiApiKey();
  if (!key) {
    console.warn("Gemini API Key missing, skipping illustration.");
    return undefined;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A clean, educational mathematical illustration of: ${prompt}. Minimalist style, white background, clear labels.` }],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Gemini generateIllustration error:", error);
  }
  return undefined;
};
