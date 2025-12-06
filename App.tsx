import React, { useState, useRef } from 'react';
import { Header } from './components/Header';
import { Button } from './components/Button';
import { ImageUploader } from './components/ImageUploader';
import { StyleCard } from './components/StyleCard';
import { ShoppingItem } from './components/ShoppingItem';
import { ComparisonSlider } from './components/ComparisonSlider';
import { DESIGN_STYLES, SURPRISE_PROMPTS, PREDEFINED_PALETTES, buildMakeoverPrompt, buildPartialPrompt, buildRefinementPrompt } from './constants';
import { AppState, FurnitureItem, ColorItem, ProcessingState, DesignMode } from './types';
import { restyleRoom, mineFurnitureData } from './services/geminiService';
import { Wand2, AlertCircle, ArrowRight, Layers, Armchair, Sparkles, Palette, Dices, RotateCw, Check } from 'lucide-react';

const App: React.FC = () => {
  // App Data State
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  
  // Mode State
  const [mode, setMode] = useState<DesignMode>('MAKEOVER');
  
  // Inputs
  // Allow null to represent "Surprise/Custom" mode where no specific preset is active
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(DESIGN_STYLES[0].id);
  const [itemsToAdd, setItemsToAdd] = useState<string>(""); // For Partial Mode
  const [refinementInstruction, setRefinementInstruction] = useState<string>(""); // For Post-Generation Refinement

  const [shoppingItems, setShoppingItems] = useState<FurnitureItem[]>([]);
  const [colorPalette, setColorPalette] = useState<ColorItem[]>([]);
  // New State for Palette Generator
  const [proposedPalette, setProposedPalette] = useState<{name: string, colors: ColorItem[]} | null>(null);

  const [processingState, setProcessingState] = useState<ProcessingState>({ status: AppState.IDLE });
  
  // Refs
  const resultsRef = useRef<HTMLDivElement>(null);

  const clearError = () => {
    if (processingState.status === AppState.ERROR) {
      setProcessingState({ status: AppState.IDLE });
    }
  };

  const handleImageUpload = (base64: string) => {
    setOriginalImage(base64);
    setGeneratedImage(null);
    setShoppingItems([]);
    setColorPalette([]);
    setProposedPalette(null);
    setProcessingState({ status: AppState.IDLE });
    setRefinementInstruction("");
  };

  const handleModeChange = (newMode: DesignMode) => {
    setMode(newMode);
    clearError();
    // If switching modes, reset to a default style if currently in "Surprise" mode to avoid confusion
    if (selectedStyleId === null) {
      setSelectedStyleId(DESIGN_STYLES[0].id);
      setRefinementInstruction("");
    }
  };

  const handleStyleChange = (id: string) => {
    setSelectedStyleId(id);
    // If we were in surprise mode (null), clear the auto-generated text so user starts fresh with the clicked style
    if (selectedStyleId === null) {
      setRefinementInstruction("");
    }
    clearError();
  };

  const handleSurpriseMe = () => {
    if (mode === 'PARTIAL') return;
    
    // Deselect standard styles to indicate "Surprise" mode
    setSelectedStyleId(null);
    
    // Pick a random creative twist
    const randomTwist = SURPRISE_PROMPTS[Math.floor(Math.random() * SURPRISE_PROMPTS.length)];
    setRefinementInstruction(randomTwist);
  };

  const handleGeneratePalette = () => {
    const random = PREDEFINED_PALETTES[Math.floor(Math.random() * PREDEFINED_PALETTES.length)];
    setProposedPalette(random);
  };

  const handleApplyPalette = () => {
    if (!proposedPalette) return;
    
    // Construct instruction
    const colorNames = proposedPalette.colors.map(c => c.name).join(", ");
    const newInstruction = `Change the room's color scheme to use this palette: ${colorNames}. Update rugs, cushions, wall art, and decor to match these colors.`;
    
    setRefinementInstruction(newInstruction);
    // NOTE: We do NOT clear proposedPalette here anymore. 
    // We keep it visible while generating so the UI doesn't revert to old colors.
    
    // Trigger refinement
    handleGenerate(true, newInstruction);
  };

  const handleGenerate = async (isRefinement: boolean = false, overrideInstruction?: string) => {
    if (!originalImage) return;

    // Use override instruction if provided (for palette applier), otherwise state
    const currentInstruction = overrideInstruction !== undefined ? overrideInstruction : refinementInstruction;

    // If we are refining, we MUST have a generated image to work on. 
    // If not, fall back to original (edge case handling)
    const canRefine = isRefinement && generatedImage && currentInstruction;
    const sourceImage = canRefine ? generatedImage : originalImage;

    // Update status message
    const msg = canRefine 
      ? "Refining your design..." 
      : (mode === 'MAKEOVER' ? "Reimagining your space..." : "Adding your items...");
      
    setProcessingState({ status: AppState.GENERATING, message: msg });
    
    // If we are starting fresh (not refining), clear old results while we wait, 
    // BUT if refining, keep showing old result until new one arrives (optional, but current flow replaces it)
    if (!canRefine) {
        // Optional: clear generated image here if you want blank slate visual
        // setGeneratedImage(null); 
    }

    try {
      let prompt = "";
      
      if (canRefine) {
        // Refinement Prompt: Edit the EXISTING generated image
        prompt = buildRefinementPrompt(currentInstruction);
      } else {
        // Fresh Generation: Use ORIGINAL image
        
        // Determine the Style Label
        let styleLabel = "Modern Minimalist"; // Default fallback
        
        if (selectedStyleId) {
          // User selected a preset card
          const selectedStyle = DESIGN_STYLES.find(s => s.id === selectedStyleId);
          if (selectedStyle) styleLabel = selectedStyle.label;
        } else {
          // Surprise Mode: The "Style" IS the refinement instruction
          styleLabel = currentInstruction || "Eclectic Unique Design";
        }
        
        if (mode === 'MAKEOVER') {
          prompt = buildMakeoverPrompt(styleLabel, currentInstruction);
        } else {
          // Partial Mode
          if (!itemsToAdd) {
             setProcessingState({ status: AppState.ERROR, message: "Please tell us what items you want to add." });
             return;
          }
          prompt = buildPartialPrompt(itemsToAdd, styleLabel, currentInstruction);
        }
      }

      // Step 1: Restyle
      // sourceImage is guaranteed to be string here because originalImage check passes and generatedImage check passes if canRefine
      const newImage = await restyleRoom(sourceImage!, prompt);
      setGeneratedImage(newImage);

      // Scroll to results immediately so user sees the transformation
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);

      // Step 2: Data Mining
      setProcessingState({ status: AppState.MINING, message: "Analyzing design & colors..." });
      
      // Prioritize the instruction that just generated the image (refinement or partial input)
      // This ensures if you asked for "plants", the miner looks for "plants"
      const miningFocus = currentInstruction || (mode === 'PARTIAL' ? itemsToAdd : undefined);
      
      const { furniture, palette } = await mineFurnitureData(newImage, miningFocus);
      
      setShoppingItems(furniture);
      setColorPalette(palette);
      
      // Clear the proposed palette ONLY after we have the real mined results
      setProposedPalette(null);

      setProcessingState({ status: AppState.COMPLETE });
    } catch (error) {
      console.error(error);
      let errorMessage = "Oops! The AI had a creative block. Please try again.";
      
      if (error instanceof Error) {
        const msg = error.message;
        const lowerMsg = msg.toLowerCase();
        
        if (lowerMsg.includes("503") || lowerMsg.includes("overloaded")) {
           errorMessage = "Service Busy: The AI is momentarily overloaded. Please try again.";
        } else {
           errorMessage = `Error: ${error.message}`;
        }
      }
      
      setProcessingState({ 
        status: AppState.ERROR, 
        message: errorMessage
      });
    }
  };

  const isProcessing = processingState.status === AppState.GENERATING || processingState.status === AppState.MINING;

  // Colors to display: either the mined palette or the proposed random palette
  const displayPalette = proposedPalette ? proposedPalette.colors : colorPalette;
  const paletteTitle = proposedPalette ? `Preview: ${proposedPalette.name}` : "Design Palette";

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />

      <main className="max-w-7xl mx-auto px-4 md:px-8 pt-8 space-y-12">
        
        {/* Hero */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
            Design your dream space <span className="text-indigo-600">your way</span>.
          </h2>
          <p className="text-lg text-gray-600">
            Customize your room in seconds.
          </p>
        </div>

        {/* --- TOP HALF: OPTIONS --- */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">
            
            {/* Left Column: Upload (Step 1) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 text-white font-bold text-sm">1</span>
                <h3 className="text-xl font-bold text-gray-900">Upload Photo</h3>
              </div>
              <ImageUploader 
                currentImage={originalImage} 
                onImageUpload={handleImageUpload} 
              />
            </div>

            {/* Right Column: Controls (Step 2 & 3) */}
            <div className="lg:col-span-7 flex flex-col gap-8">
              
              {/* Step 2: Goal */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 text-white font-bold text-sm">2</span>
                  <h3 className="text-xl font-bold text-gray-900">Choose Goal</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleModeChange('MAKEOVER')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${mode === 'MAKEOVER' ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : 'border-gray-200 bg-white hover:border-gray-300 text-gray-600'}`}
                  >
                    <Layers className="mb-2" size={24} />
                    <div className="font-bold text-sm">Redecorate Room</div>
                    <div className="text-xs opacity-70 mt-1">Full style makeover</div>
                  </button>
                  
                  <button
                    onClick={() => handleModeChange('PARTIAL')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${mode === 'PARTIAL' ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : 'border-gray-200 bg-white hover:border-gray-300 text-gray-600'}`}
                  >
                    <Armchair className="mb-2" size={24} />
                    <div className="font-bold text-sm">Add Decor</div>
                    <div className="text-xs opacity-70 mt-1">Keep room, add items</div>
                  </button>
                </div>
              </div>

              {/* Step 3: Vibe / Details */}
              <div className="space-y-4 flex-1">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 text-white font-bold text-sm">3</span>
                    <h3 className="text-xl font-bold text-gray-900">
                      {mode === 'MAKEOVER' ? 'Select Vibe' : 'Customize Items'}
                    </h3>
                  </div>
                  {mode === 'MAKEOVER' && (
                    <button 
                      onClick={handleSurpriseMe}
                      className={`flex items-center justify-center gap-2 text-lg font-bold px-8 py-4 rounded-xl transition-all shadow-md active:scale-95 hover:shadow-lg ${
                        selectedStyleId === null 
                          ? 'bg-purple-600 text-white ring-4 ring-purple-200 shadow-purple-200 scale-[1.02]' 
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      <Dices size={24} /> SURPRISE ME
                    </button>
                  )}
                </div>

                {/* Item Description Input for Partial Mode */}
                {mode === 'PARTIAL' && (
                  <div className="animate-fade-in mb-4">
                    <textarea
                      value={itemsToAdd}
                      onChange={(e) => { setItemsToAdd(e.target.value); clearError(); }}
                      placeholder="e.g., A large Persian rug, a standing mirror, and a plant..."
                      className="w-full p-4 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-0 outline-none min-h-[80px] text-gray-700 resize-none transition-colors text-sm"
                    />
                  </div>
                )}

                {/* Style Selection Grid */}
                <div className="animate-fade-in">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {DESIGN_STYLES.map(style => (
                      <StyleCard 
                        key={style.id}
                        style={style}
                        isSelected={selectedStyleId === style.id}
                        onClick={() => handleStyleChange(style.id)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Generate Button (Main / Fresh Start) */}
              <div>
                <Button 
                  onClick={() => handleGenerate(false)} 
                  disabled={!originalImage || isProcessing || (mode === 'PARTIAL' && !itemsToAdd)}
                  isLoading={isProcessing}
                  className="w-full py-4 text-lg shadow-xl"
                >
                  {isProcessing ? processingState.message : (
                    <>
                      {mode === 'MAKEOVER' ? 'Redesign Room' : 'Add Items'} <Wand2 size={20} />
                    </>
                  )}
                </Button>
                
                {processingState.status === AppState.ERROR && (
                  <div className="mt-4 p-4 rounded-xl flex gap-3 bg-red-50 border border-red-200 text-red-700 text-sm items-start animate-fade-in">
                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold">Error</p>
                      <p>{processingState.message}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* --- BOTTOM HALF: MASTERPIECE (Only visible when image is generated or placeholder) --- */}
        <div 
          className="space-y-8 scroll-mt-24" 
          ref={resultsRef}
        >
           <div className="flex items-center gap-4">
             <div className="h-px bg-gray-200 flex-1"></div>
             <h2 className="text-2xl font-bold text-gray-400">Your Masterpiece</h2>
             <div className="h-px bg-gray-200 flex-1"></div>
           </div>

           {/* Comparison View */}
           <section className="bg-white rounded-3xl overflow-hidden shadow-sm relative min-h-[400px]">
              {generatedImage && originalImage ? (
                <div className="animate-fade-in">
                  <ComparisonSlider 
                    beforeImage={originalImage} 
                    afterImage={generatedImage} 
                  />
                </div>
              ) : (
                <div className="h-[400px] flex flex-col items-center justify-center p-12 text-center text-gray-400 space-y-4 border border-gray-200 rounded-3xl bg-gray-50/50">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <Layers className="text-gray-300" size={40} />
                  </div>
                  <p className="text-xl font-medium text-gray-500">Your design will appear here</p>
                  <p className="text-sm text-gray-400 max-w-xs">
                      Complete the steps above to see the magic.
                  </p>
                </div>
              )}
           </section>

           {/* Results Content (Refinement, Palette, Shopping) */}
           {generatedImage && (
             <div className="grid lg:grid-cols-12 gap-8 animate-fade-in">
                
                {/* Left: Refinement */}
                <div className="lg:col-span-5 space-y-6">
                   <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 h-full">
                     <div className="flex items-center gap-3 mb-4">
                       <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                         <Sparkles size={20} />
                       </div>
                       <h3 className="text-xl font-bold text-gray-900">Refine Result</h3>
                     </div>
                     <p className="text-sm text-gray-500 mb-4">Not quite right? Describe what you want to change.</p>
                     <div className="flex flex-col gap-3">
                        <textarea 
                          value={refinementInstruction}
                          onChange={(e) => setRefinementInstruction(e.target.value)}
                          placeholder="e.g., Make the rug blue, remove the lamp, make it brighter..."
                          className="w-full p-4 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-0 outline-none transition-colors min-h-[120px] resize-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              // Pass true to indicate this is a refinement of the EXISTING result
                              handleGenerate(true);
                            }
                          }}
                        />
                        <Button 
                          onClick={() => handleGenerate(true)} // Explicitly pass true for refinement
                          disabled={isProcessing || !refinementInstruction.trim()}
                          isLoading={isProcessing}
                          variant="secondary"
                        >
                          Refine Design
                        </Button>
                     </div>
                   </section>
                </div>

                {/* Right: Palette & Shopping */}
                <div className="lg:col-span-7 space-y-8">
                   
                   {/* Palette */}
                   {(colorPalette.length > 0 || proposedPalette) && (
                      <section>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-pink-100 text-pink-600 rounded-lg">
                               <Palette size={20} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">{paletteTitle}</h3>
                          </div>
                          
                          <div className="flex gap-2">
                             {/* Generator Button */}
                             <button
                               onClick={handleGeneratePalette}
                               disabled={isProcessing}
                               className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-pink-600 bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-lg transition-colors"
                               title="Generate a new random color palette"
                             >
                               <RotateCw size={14} className={isProcessing ? "animate-spin" : ""} />
                               {proposedPalette ? "Shuffle" : "Generator"}
                             </button>

                             {/* Apply Button (Only visible if proposed) */}
                             {proposedPalette && (
                               <button
                                 onClick={handleApplyPalette}
                                 disabled={isProcessing}
                                 className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-pink-600 hover:bg-pink-700 rounded-lg transition-colors shadow-sm"
                               >
                                 <Check size={14} />
                                 Apply to Room
                               </button>
                             )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                           {displayPalette.map((color, idx) => (
                             <div key={idx} className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-2">
                                <div 
                                  className="w-full h-12 rounded-lg shadow-inner transition-colors duration-500"
                                  style={{ backgroundColor: color.hex }}
                                ></div>
                                <div className="text-center">
                                  <p className="font-bold text-gray-800 text-xs truncate" title={color.name}>{color.name}</p>
                                  <p className="text-[10px] text-gray-400 font-mono uppercase">{color.hex}</p>
                                </div>
                             </div>
                           ))}
                        </div>
                        {proposedPalette && (
                           <p className="text-xs text-gray-400 mt-2 text-center animate-fade-in">
                             Click "Apply" to regenerate the room with these colors.
                           </p>
                        )}
                      </section>
                   )}

                   {/* Shopping List */}
                   {shoppingItems.length > 0 && (
                      <section>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                             <ArrowRight size={20} />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900">Shop the Look</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {shoppingItems.map((item, idx) => (
                            <ShoppingItem key={idx} item={item} index={idx} />
                          ))}
                        </div>
                      </section>
                   )}
                </div>
             </div>
           )}
        </div>

      </main>
    </div>
  );
};

export default App;