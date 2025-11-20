import { GoogleGenAI, Modality, Type } from "@google/genai";
import { FurnitureItem } from "../types";
import { buildMiningPrompt } from "../constants";

// Lazy initialize the client
let aiClient: GoogleGenAI | null = null;

const getAiClient = () => {
  if (!aiClient) {
    // The API key must be obtained exclusively from the environment variable process.env.API_KEY
    // per the environment guidelines.
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
       console.error("CRITICAL: No API Key found. Please ensure process.env.API_KEY is set.");
    }

    aiClient = new GoogleGenAI({ apiKey: apiKey || '' });
  }
  return aiClient;
};

/**
 * Helper to extract mime type and base64 data from a data URL
 */
const getBase64Data = (base64String: string) => {
  const matches = base64String.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    return { mimeType: matches[1], data: matches[2] };
  }
  return {
    mimeType: 'image/jpeg',
    data: base64String.replace(/^data:image\/[a-z]+;base64,/, "")
  };
};

export const restyleRoom = async (base64Image: string, prompt: string): Promise<string> => {
  try {
    const { mimeType, data } = getBase64Data(base64Image);
    const client = getAiClient();
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data, mimeType } },
          { text: prompt },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
        // Temperature is not supported in gemini-2.5-flash-image for image generation
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part && part.inlineData && part.inlineData.data) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Restyling failed:", error);
    throw error;
  }
};

export const mineFurnitureData = async (generatedBase64Image: string, focusItems?: string): Promise<FurnitureItem[]> => {
  try {
    const { mimeType, data } = getBase64Data(generatedBase64Image);
    const prompt = buildMiningPrompt(focusItems);
    const client = getAiClient();

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType, data } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              itemName: { type: Type.STRING },
              color: { type: Type.STRING },
              searchQuery: { type: Type.STRING },
            },
            required: ["itemName", "color", "searchQuery"],
          },
        },
      },
    });

    return JSON.parse(response.text || "[]") as FurnitureItem[];
  } catch (error) {
    console.error("Data mining failed:", error);
    return [];
  }
};