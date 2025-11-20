import { DesignStyle } from './types';

export const DESIGN_STYLES: DesignStyle[] = [
  { 
    id: 'modern', 
    label: 'Modern Minimalist', 
    description: 'Clean lines, neutral colors, and functional furniture.', 
    color: 'bg-slate-800' 
  },
  { 
    id: 'coastal', 
    label: 'Coastal Breeze', 
    description: 'Light airy spaces, soft blues, whites, and natural textures.', 
    color: 'bg-cyan-700' 
  },
  { 
    id: 'farmhouse', 
    label: 'Modern Farmhouse', 
    description: 'Rustic charm, reclaimed wood, neutral tones, and cozy vibes.', 
    color: 'bg-stone-700' 
  },
  { 
    id: 'boho', 
    label: 'Bohemian Chic', 
    description: 'Eclectic patterns, plants, rattan, and warm tones.', 
    color: 'bg-orange-700' 
  },
  { 
    id: 'traditional', 
    label: 'Classic Traditional', 
    description: 'Timeless elegance, rich wood finishes, and symmetrical layouts.', 
    color: 'bg-indigo-800' 
  },
  { 
    id: 'midcentury', 
    label: 'Mid-Century Modern', 
    description: 'Retro vibes, organic curves, and teak wood.', 
    color: 'bg-amber-700' 
  }
];

/**
 * Constructs the prompt for a Full Room Makeover
 */
export const buildMakeoverPrompt = (styleLabel: string, refinement: string = '') => {
  let basePrompt = `Redesign this room to match the ${styleLabel} style. Keep the original room layout but change the furniture and colors to match the ${styleLabel} aesthetic. Photorealistic, 8k resolution, interior design photography.`;
  
  // Smart flooring preservation logic for makeover mode
  const lowerInstruction = refinement.toLowerCase();
  const mentionsFlooring = lowerInstruction.includes('floor') || 
                           lowerInstruction.includes('carpet') || 
                           lowerInstruction.includes('wood') || 
                           lowerInstruction.includes('tile') || 
                           lowerInstruction.includes('hardwood') || 
                           lowerInstruction.includes('concrete') ||
                           lowerInstruction.includes('rug');

  if (!mentionsFlooring) {
    basePrompt += " Keep the original flooring material and color unchanged.";
  }
  
  if (refinement && refinement.trim().length > 0) {
    basePrompt += `\n\nIMPORTANT SPECIFIC REQUIREMENT: ${refinement}. Focus on this request.`;
  }
  
  return basePrompt;
};

/**
 * Constructs the prompt for Partial Edits (Adding Items)
 */
export const buildPartialPrompt = (itemsToAdd: string, styleLabel: string, refinement: string = '') => {
  const requestDescription = refinement 
    ? `Add "${itemsToAdd}" and specifically "${refinement}"`
    : `Add "${itemsToAdd}"`;

  let basePrompt = `Task: Precision In-Painting / Object Insertion.
  
  The user wants to modify ONLY specific parts of the image.
  USER REQUEST: ${requestDescription}.
  STYLE context for new items: ${styleLabel}.
  
  CRITICAL PRESERVATION RULES (STRICT ADHERENCE REQUIRED):
  1. PRESERVE 99% OF THE ORIGINAL IMAGE PIXELS. This is NOT a redesign. This is a targeted edit.
  2. DO NOT CHANGE THE FOLLOWING UNDER ANY CIRCUMSTANCES (unless the user explicitly asks to replace them):
     - DO NOT change the Coffee Table.
     - DO NOT change the Rugs (do NOT add a rug if not asked).
     - DO NOT change the Gallery Wall or existing Art.
     - DO NOT change the Sofa or main furniture layout.
     - DO NOT resize the TV or screens.
  3. IF adding an item (e.g. "add a plant"), find an EMPTY spot and place it there. Do not replace existing furniture.
  4. IF editing an item (e.g. "green wall"), identify that specific item and change ONLY its color/texture. Keep the geometry and surrounding objects identical.
  
  Output: A photorealistic image identical to the original except for the requested change.
  `;

  return basePrompt;
};

/**
 * Constructs the mining prompt.
 * If focusItems is provided (Partial Mode), it asks the AI to only look for those items.
 * Otherwise (Makeover Mode), it asks for the key defining items of the room.
 */
export const buildMiningPrompt = (focusItems?: string) => {
  if (focusItems && focusItems.trim().length > 0) {
    return `Analyze this interior design image. The user specifically requested to add the following items: "${focusItems}". Identify these specific items in the generated image. Return a JSON list containing the item name, its specific color/material as seen in the image, and a google search query string to buy it. Only include the items related to the user's request.`;
  }
  
  return `Analyze this interior design image. Identify 5 distinct, key furniture or decor items that define the style. Return a JSON list containing the item name, its specific color/material, and a google search query string to buy it (e.g., "Modern blue velvet sofa buy online").`;
};