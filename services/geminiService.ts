import { GoogleGenAI, Type } from "@google/genai";
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

/**
 * Compresses and resizes an image to ensure it fits within API payload limits.
 * Max dimension set to 1024px.
 */
const compressImage = async (base64String: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const maxDim = 1024;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      // Convert to JPEG with 0.8 quality for good balance
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = (err) => reject(err);
    img.src = base64String;
  });
};

export const restyleRoom = async (base64Image: string, prompt: string): Promise<string> => {
  try {
    // Optimize image before sending
    const optimizedImage = await compressImage(base64Image);
    const { mimeType, data } = getBase64Data(optimizedImage);
    
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
        // Temperature is not supported in gemini-2.5-flash-image for image generation
      },
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Restyling failed:", error);
    throw error;
  }
};

export const mineFurnitureData = async (generatedBase64Image: string, focusItems?: string): Promise<FurnitureItem[]> => {
  try {
    // Optimize image before sending (even for mining, smaller is faster/safer)
    const optimizedImage = await compressImage(generatedBase64Image);
    const { mimeType, data } = getBase64Data(optimizedImage);
    
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
