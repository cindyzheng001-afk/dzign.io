import { GoogleGenAI, Type } from "@google/genai";
import { FurnitureItem } from "../types";
import { buildMiningPrompt } from "../constants";

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
 * Max dimension set to 512px to ensure high reliability and prevent timeouts.
 */
const compressImage = async (base64String: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const maxDim = 512; // Reduced to 512px for maximum stability and speed

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
      // Convert to JPEG with 0.6 quality for reduced payload size
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = (err) => reject(err);
    img.src = base64String;
  });
};

export const restyleRoom = async (base64Image: string, prompt: string): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey || apiKey.trim() === '') {
       // Throw a specific string we can catch in the UI
       throw new Error("API_KEY_MISSING");
    }
    
    const client = new GoogleGenAI({ apiKey });

    // Optimize image before sending
    const optimizedImage = await compressImage(base64Image);
    const { mimeType, data } = getBase64Data(optimizedImage);
    
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data, mimeType } },
          { text: prompt },
        ],
      },
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No image generated. The model may have been blocked by safety settings.");
  } catch (error) {
    console.error("Restyling failed:", error);
    throw error;
  }
};

export const mineFurnitureData = async (generatedBase64Image: string, focusItems?: string): Promise<FurnitureItem[]> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
       return [];
    }
    const client = new GoogleGenAI({ apiKey });

    // Optimize image before sending (even for mining, smaller is faster/safer)
    const optimizedImage = await compressImage(generatedBase64Image);
    const { mimeType, data } = getBase64Data(optimizedImage);
    
    const prompt = buildMiningPrompt(focusItems);

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