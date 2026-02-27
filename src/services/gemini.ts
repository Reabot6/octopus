import { GoogleGenAI, Type } from "@google/genai";
import { Prerequisite, SolutionStep } from "../types";

const getApiKey = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "MY_GEMINI_API_KEY") {
    throw new Error("Gemini API Key is missing. Please configure GEMINI_API_KEY in your environment secrets.");
  }
  return key;
};

export const analyzeProblem = async (problem: string): Promise<{
  prerequisites: Prerequisite[];
  similarProblem: string;
  similarSolution: SolutionStep[];
}> => {
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this math problem: "${problem}". 
      1. Identify the core concepts (prerequisites) needed to solve it. Organize them in a logical tree structure (max depth 2).
      2. Create a similar but different math problem.
      3. Provide a step-by-step solution for the similar problem, explicitly linking each step to the relevant prerequisite IDs.
      
      Return the result as JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            prerequisites: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  description: { type: Type.STRING },
                  children: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        label: { type: Type.STRING },
                        description: { type: Type.STRING },
                      },
                      required: ["id", "label", "description"]
                    }
                  }
                },
                required: ["id", "label", "description"]
              }
            },
            similarProblem: { type: Type.STRING },
            similarSolution: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  step: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  prerequisiteIds: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["step", "explanation", "prerequisiteIds"]
              }
            }
          },
          required: ["prerequisites", "similarProblem", "similarSolution"]
        }
      }
    });

    if (!response.text) {
      throw new Error("Empty response from Gemini");
    }

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini analyzeProblem error:", error);
    throw error;
  }
};

export const teachConcept = async (
  concept: string, 
  history: { role: 'user' | 'model', text: string }[]
): Promise<{ text: string; illustrationPrompt?: string }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        { 
          role: 'user', 
          parts: [{ text: `You are a helpful math teacher. You are explaining the concept: "${concept}". 
          Use real-world examples and ask the student for input to keep it interactive.
          If an illustration would help explain the concept, provide a short descriptive prompt for an image generator in the 'illustrationPrompt' field.
          Keep the explanation concise and engaging.` }] 
        },
        ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] }))
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            illustrationPrompt: { type: Type.STRING }
          },
          required: ["text"]
        }
      }
    });

    if (!response.text) {
      throw new Error("Empty response from Gemini");
    }

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini teachConcept error:", error);
    throw error;
  }
};

export const generateIllustration = async (prompt: string): Promise<string | undefined> => {
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
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
