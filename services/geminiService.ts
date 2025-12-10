// services/geminiService.ts
// SECURE VERSION - All API calls go through Netlify Functions
// NO API KEY IN FRONTEND CODE

import { MiningResponse, FurnitureItem } from "../types";
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
 * Increased max dimension to 1024px to preserve architectural details.
 */
const compressImage = async (base64String: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const maxDim = 1024; // Increased from 512 to 1024 for better structural detail

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
      
      // Use high quality interpolation
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      ctx.drawImage(img, 0, 0, width, height);
      // Convert to JPEG with 0.95 quality for better detail retention and fewer artifacts
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = (err) => reject(err);
    img.src = base64String;
  });
};

/**
 * Retry utility for API calls with exponential backoff
 */
const retryWithBackoff = async <T>(
  operation: () => Promise<T>, 
  retries = 3, 
  delay = 2000
): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    // Check for 429 (Resource Exhausted) or 503 (Service Unavailable)
    const isRetryable = 
      error?.status === 429 || 
      error?.status === 503 ||
      error?.retryable === true ||
      (error?.message && (
        error.message.includes('429') || 
        error.message.toLowerCase().includes('quota') || 
        error.message.includes('503') || 
        error.message.toLowerCase().includes('overloaded') ||
        error.message.toLowerCase().includes('rate limit')
      ));

    if (retries > 0 && isRetryable) {
      console.warn(`API Rate limit hit. Retrying in ${delay}ms... (Attempts left: ${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(operation, retries - 1, delay * 2);
    }
    throw error;
  }
};

/**
 * Restyles a room image using Gemini via Netlify Function
 * NO API KEY NEEDED - Handled server-side
 */
export const restyleRoom = async (base64Image: string, prompt: string): Promise<string> => {
  try {
    // Optimize image before sending
    const optimizedImage = await compressImage(base64Image);
    
    // Wrap API call in retry logic
    const response = await retryWithBackoff(async () => {
      // Call Netlify Function instead of Gemini directly
      const res = await fetch('/.netlify/functions/gemini-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: optimizedImage,
          prompt: prompt
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        const error: any = new Error(errorData.error || 'Image generation failed');
        error.status = res.status;
        error.retryable = errorData.retryable || false;
        throw error;
      }

      return res.json();
    });

    // Extract generated image from response
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
        // Also check for inline_data (snake_case from API)
        if (part.inline_data && part.inline_data.data) {
          return `data:image/png;base64,${part.inline_data.data}`;
        }
      }
    }

    // Check if the model refused to generate due to safety/filters
    if (response.candidates?.[0]?.finishReason) {
      console.warn("Model Finish Reason:", response.candidates[0].finishReason);
      throw new Error(`The AI couldn't generate the image (Reason: ${response.candidates[0].finishReason}). Please try a different photo or style.`);
    }

    throw new Error("No image generated by the AI. Please try again.");
  } catch (e) {
    console.error("Restyle Room Error:", e);
    throw e;
  }
};

/**
 * Mines furniture and color data from an image using Gemini via Netlify Function
 * NO API KEY NEEDED - Handled server-side
 */
export const mineFurnitureData = async (base64Image: string, focusItems?: string): Promise<MiningResponse> => {
  try {
    const optimizedImage = await compressImage(base64Image);
    const prompt = buildMiningPrompt(focusItems);

    // Wrap API call in retry logic
    const response = await retryWithBackoff(async () => {
      // Call Netlify Function instead of Gemini directly
      const res = await fetch('/.netlify/functions/gemini-mining', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: optimizedImage,
          prompt: prompt
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        // For mining, we can gracefully handle errors by returning empty data
        if (errorData.furniture && errorData.palette) {
          return errorData; // Already has fallback data
        }
        const error: any = new Error(errorData.error || 'Mining failed');
        error.status = res.status;
        error.retryable = errorData.retryable || false;
        throw error;
      }

      return res.json();
    });

    // Extract and parse the response
    if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
      const parsed = JSON.parse(response.candidates[0].content.parts[0].text) as { 
        furniture: Omit<FurnitureItem, 'id'>[], 
        palette: any[] 
      };
      
      // Add IDs to furniture items
      const furnitureWithIds = parsed.furniture.map(item => ({
        ...item,
        id: crypto.randomUUID()
      }));

      return {
        furniture: furnitureWithIds,
        palette: parsed.palette || []
      };
    }

    // Fallback to empty data
    return { furniture: [], palette: [] };
  } catch (e) {
    console.error("Mining Data Error:", e);
    // Return empty data instead of crashing
    return { furniture: [], palette: [] };
  }
};