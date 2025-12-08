import { DesignStyle, ColorItem } from './types';

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
  },
  { 
    id: 'industrial', 
    label: 'Industrial Loft', 
    description: 'Exposed brick, metal accents, concrete, and raw materials.', 
    color: 'bg-gray-800' 
  },
  { 
    id: 'scandi', 
    label: 'Scandinavian', 
    description: 'Hygge, functionality, white walls, and light wood.', 
    color: 'bg-emerald-700' 
  }
];

export const SURPRISE_PROMPTS = [
  "Cyberpunk Neon Interior Decor",
  "Wes Anderson Movie Set Pastel Style",
  "Vampire Gothic Mansion Interior",
  "1970s Disco Fever Interior",
  "Sci-Fi Space Station Interior Design",
  "Atlantis Themed Bedroom Decor",
  "Forest Witch Cottagecore Interior",
  "Maximalist Barbiecore Pink Decor"
];

export const PREDEFINED_PALETTES: { name: string; colors: ColorItem[] }[] = [
  {
    name: "Earthy Warmth",
    colors: [
      { hex: "#8D6E63", name: "Cocoa" },
      { hex: "#D7CCC8", name: "Almond" },
      { hex: "#EFEBE9", name: "Soft Linen" },
      { hex: "#5D4037", name: "Espresso" },
      { hex: "#FFAB91", name: "Terracotta" }
    ]
  },
  {
    name: "Ocean Calm",
    colors: [
      { hex: "#006064", name: "Deep Cyan" },
      { hex: "#B2EBF2", name: "Sea Foam" },
      { hex: "#0097A7", name: "Teal" },
      { hex: "#FFFFFF", name: "White Foam" },
      { hex: "#4DD0E1", name: "Sky Blue" }
    ]
  },
  {
    name: "Moody Industrial",
    colors: [
      { hex: "#212121", name: "Charcoal" },
      { hex: "#757575", name: "Concrete" },
      { hex: "#BDBDBD", name: "Silver" },
      { hex: "#BF360C", name: "Rust" },
      { hex: "#3E2723", name: "Dark Wood" }
    ]
  },
  {
    name: "Pastel Dream",
    colors: [
      { hex: "#F8BBD0", name: "Pink Lace" },
      { hex: "#E1BEE7", name: "Thistle" },
      { hex: "#C5CAE9", name: "Periwinkle" },
      { hex: "#B2DFDB", name: "Mint" },
      { hex: "#FFF9C4", name: "Lemon Chiffon" }
    ]
  },
  {
    name: "Forest Retreat",
    colors: [
      { hex: "#1B5E20", name: "Dark Green" },
      { hex: "#4CAF50", name: "Fern" },
      { hex: "#81C784", name: "Sage" },
      { hex: "#3E2723", name: "Bark" },
      { hex: "#F5F5F5", name: "Cloud" }
    ]
  },
  {
    name: "Midnight Luxe",
    colors: [
      { hex: "#0D47A1", name: "Royal Blue" },
      { hex: "#FFD700", name: "Gold" },
      { hex: "#1A237E", name: "Navy" },
      { hex: "#EEEEEE", name: "Silk" },
      { hex: "#000000", name: "Onyx" }
    ]
  }
];

/**
 * Constructs the prompt for a Full Room Makeover
 */
export const buildMakeoverPrompt = (styleLabel: string, refinement: string = '') => {
  let basePrompt = `Role: Virtual Stager (Furniture Replacement Only).
  Input: An image of a room.
  Goal: Generate a photorealistic image of the EXACT SAME room with "${styleLabel}" furniture and decor.
  
  🚧 HARD ARCHITECTURAL CONSTRAINTS (CRITICAL):
  1. **CEILING PROTECTION (HIGHEST PRIORITY)**: The ceiling structure must remain UNTOUCHED. Preserve all beams, cornices, molding, skylights, and the ceiling height/slope. Do NOT smooth out textured ceilings or remove structural elements.
  2. **ABSOLUTELY NO NEW WINDOWS**: Walls must remain solid. 
  3. **PRESERVE STRUCTURE**: Do NOT add, remove, or move walls, doors, or beams.
  4. **WINDOW VIEW PROTECTION (MANDATORY)**: The scenery, weather, lighting, and objects visible THROUGH the windows must remain 100% IDENTICAL to the original image. Do not change the outside world. Treat the window glass and the view behind it as a "protected mask" that cannot be repainted.
  5. **LIGHTING**: Maintain the original direction of light coming from windows.
  
  ✅ ALLOWED CHANGES (DECOR ONLY):
  - Replace furniture (sofas, tables, chairs) unless asked to preserve them.
  - Change soft furnishings (rugs, curtains, cushions).
  - Change wall finishes (paint, wallpaper) - but keep the wall flat and solid.
  - Update light fixtures (chandeliers) but keep the mounting point.
  
  The room's shell (CEILING, WALLS, FLOOR SHAPE, WINDOWS, and EXTERIOR VIEW) is LOCKED and READ-ONLY.
  `;
  
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
    basePrompt += " PRESERVATION: Keep the original flooring material and color unchanged unless it clashes heavily.";
  }
  
  if (refinement && refinement.trim().length > 0) {
    basePrompt += `\n\nUSER THEME/REFINEMENT: "${refinement}".
    
    IMPORTANT: Apply the vibe of "${refinement}" to the INTERIOR FURNITURE AND DECOR ONLY. 
    - DO NOT change the outside environment or view through windows.
    - If the theme suggests a different location (e.g. underwater, space, forest), IGNORE that location for the exterior view. Keep the original exterior view.
    - DO NOT add new windows to match the theme.
    - DO NOT change the ceiling structure to match the theme.
    `;
  }
  
  return basePrompt;
};

/**
 * Constructs the prompt for Partial Edits (Adding Items)
 */
export const buildPartialPrompt = (itemsToAdd: string, styleLabel: string, refinement: string = '') => {
  const requestDescription = refinement 
    ? `Action: Add/Modify "${itemsToAdd}" with style "${refinement}"`
    : `Action: Add/Modify "${itemsToAdd}"`;

  let basePrompt = `Task: Strict In-Painting / Object Insertion.
  
  User Request: ${requestDescription}.
  Style Context: ${styleLabel}.
  
  CRITICAL PRESERVATION RULES:
  1. **MODIFY ONLY** the requested items.
  2. **PRESERVE EXISTING FURNITURE**: Do NOT change the sofa, armchairs, or coffee table unless the User Request specifically asks to change them.
  3. **CEILING & WALLS**: Do not touch the ceiling, beams, or light fixtures. Do not move walls.
  4. **NO NEW WINDOWS**: Keep existing walls solid.
  5. **PRESERVE OUTDOOR VIEW**: Do not modify what is seen through the windows.
  
  If the user asks to "Change the rug", you must ONLY change the rug. The couch must remain identical.
  If the user asks to "Add a plant", you must ONLY add the plant. Do not redecorate the rest of the room.
  
  Output: The original room with ONLY the requested items added or modified.
  `;

  return basePrompt;
};

/**
 * Constructs the prompt for Refining a generated image
 */
export const buildRefinementPrompt = (instruction: string) => {
  return `Task: Targeted Image Editing / Inpainting.
  
  Input Image: provided.
  User Instruction: "${instruction}"
  
  CRITICAL PRESERVATION RULES (OBJECT PERMANENCE):
  1. **TARGETED ACTION ONLY**: You are ONLY allowed to change the specific objects mentioned in the User Instruction.
  2. **PROTECT EXISTING FURNITURE**: 
     - If the instruction is "change the rug", you MUST KEEP the sofa, coffee table, and other furniture EXACTLY as they are. 
     - If the instruction is "add a painting", you MUST NOT change the furniture.
     - Do not "re-imagine" the room. Only apply the specific edit.
  3. **FROZEN PIXELS**: Treat the unmentioned parts of the image as a "frozen mask". 
  4. **STRUCTURAL INTEGRITY**: Keep the exact same room layout, camera angle, and lighting.
  5. **PROTECT OUTDOORS**: The view through any windows must remain bit-for-bit identical.
  
  Goal: Return the same image, but with the specific user tweak applied. High realism.
  `;
};

/**
 * Constructs the mining prompt.
 */
export const buildMiningPrompt = (focusItems?: string) => {
  let prompt = `Analyze this interior design image. `;
  
  if (focusItems && focusItems.trim().length > 0) {
    prompt += `The user specifically requested: "${focusItems}". 
    CRITICAL: You MUST identify and list the specific furniture, decor, or plants that correspond to this request.
    If the user asked for plants, list them. If they asked for a rug, list it.
    
    Generate a list of 5-8 items, prioritizing the user's requested items first, then other key design elements.`;
  } else {
    prompt += `Identify 5 distinct, key furniture or decor items that define the style. `;
  }

  prompt += `
  ALSO, analyze the image to extract a cohesive Color Palette. Identify the 5 most dominant or accent colors used in the design.
  
  Return a JSON object with two arrays:
  1. "furniture": A list containing the item name, its specific color/material, and a google search query.
  2. "palette": A list of 5 colors, each with a "hex" code and a descriptive "name" (e.g., "Midnight Blue", "Sage Green").
  `;
  
  return prompt;
};
