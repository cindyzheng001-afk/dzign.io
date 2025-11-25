import React, { useState } from 'react';
import { Header } from './components/Header';
import { Button } from './components/Button';
import { ImageUploader } from './components/ImageUploader';
import { StyleCard } from './components/StyleCard';
import { ShoppingItem } from './components/ShoppingItem';
import { ComparisonSlider } from './components/ComparisonSlider';
import { DESIGN_STYLES, buildMakeoverPrompt, buildPartialPrompt } from './constants';
import { AppState, FurnitureItem, ProcessingState, DesignMode } from './types';
import { restyleRoom, mineFurnitureData } from './services/geminiService';
import { Wand2, AlertCircle, ArrowRight, Layers, Armchair, FileKey, Sparkles } from 'lucide-react';

const App: React.FC = () => {
  // App Data State
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  
  // Mode State
  const [mode, setMode] = useState<DesignMode>('MAKEOVER');
  
  // Inputs
  const [selectedStyleId, setSelectedStyleId] = useState<string>(DESIGN_STYLES[0].id);
  const [itemsToAdd, setItemsToAdd] = useState<string>(""); // For Partial Mode
  const [refinementInstruction, setRefinementInstruction] = useState<string>(""); // For Post-Generation Refinement

  const [shoppingItems, setShoppingItems] = useState<FurnitureItem[]>([]);
  const [processingState, setProcessingState] = useState<ProcessingState>({ status: AppState.IDLE });

  const clearError = () => {
    if (processingState.status === AppState.ERROR) {
      setProcessingState({ status: AppState.IDLE });
    }
  };

  const handleImageUpload = (base64: string) => {
    setOriginalImage(base64);
    setGeneratedImage(null);
    setShoppingItems([]);
    setProcessingState({ status: AppState.IDLE });
    setRefinementInstruction("");
  };

  const handleModeChange = (newMode: DesignMode) => {
    setMode(newMode);
    clearError();
  };

  const handleStyleChange = (id: string) => {
    setSelectedStyleId(id);
    clearError();
  };

  const handleGenerate = async () => {
    if (!originalImage) return;

    setProcessingState({ status: AppState.GENERATING, message: mode === 'MAKEOVER' ? "Reimagining your space..." : "Adding your items..." });
    
    // Only clear generated image if we aren't refining (optional UX choice, but clearer to reset)
    // If refining, we might want to keep the old one until new one arrives, but for simplicity we reset.
    if (!refinementInstruction) {
        setGeneratedImage(null);
        setShoppingItems([]);
    }

    try {
      let prompt = "";
      const selectedStyle = DESIGN_STYLES.find(s => s.id === selectedStyleId);
      
      if (mode === 'MAKEOVER') {
        if (!selectedStyle) return;
        prompt = buildMakeoverPrompt(selectedStyle.label, refinementInstruction);
      } else {
        // Partial Mode
        if (!itemsToAdd) {
           setProcessingState({ status: AppState.ERROR, message: "Please tell us what items you want to add." });
           return;
        }
        // Fallback to selected style or default
        const styleLabel = selectedStyle?.label || 'Modern Minimalist';
        prompt = buildPartialPrompt(itemsToAdd, styleLabel, refinementInstruction);
      }

      // Step 1: Restyle
      const newImage = await restyleRoom(originalImage, prompt);
      setGeneratedImage(newImage);

      // Step 2: Data Mining
      setProcessingState({ status: AppState.MINING, message: "Finding furniture matches..." });
      
      const miningFocus = mode === 'PARTIAL' ? itemsToAdd : undefined;
      const items = await mineFurnitureData(newImage, miningFocus);
      
      setShoppingItems(items);

      setProcessingState({ status: AppState.COMPLETE });
    } catch (error) {
      console.error(error);
      let errorMessage = "Oops! The AI had a creative block. Please try again.";
      
      if (error instanceof Error) {
        const msg = error.message;
        const lowerMsg = msg.toLowerCase();
        
        if (msg === 'API_KEY_MISSING') {
          errorMessage = "API_KEY_MISSING"; // Special code to render the help UI
        } else if (lowerMsg.includes("requested entity was not found") || lowerMsg.includes("403") || lowerMsg.includes("api key")) {
           errorMessage = "Authentication Error: API Key is invalid or expired. Please check your .env file.";
        } else if (lowerMsg.includes("503") || lowerMsg.includes("overloaded")) {
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
  const isApiKeyError = processingState.message === "API_KEY_MISSING";

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />

      <main className="max-w-6xl mx-auto px-4 md:px-8 pt-8 space-y-12">
        
        {/* Hero / Intro */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
            Design your dream space <span className="text-indigo-600">your way</span>.
          </h2>
          <p className="text-lg text-gray-600">
            Redecorate the entire room or just add the finishing touches.
          </p>
        </div>

        {/* Main Interaction Area */}
        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* Left: Controls */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Step 1: Upload */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 text-white font-bold text-sm">1</span>
                <h3 className="text-xl font-bold text-gray-900">Upload Photo</h3>
              </div>
              <ImageUploader 
                currentImage={originalImage} 
                onImageUpload={handleImageUpload} 
              />
            </section>

            {/* Step 2: Choose Goal (Mode Selection) */}
            <section className="space-y-4">
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
            </section>

            {/* Step 3: Contextual Input based on Mode */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 text-white font-bold text-sm">3</span>
                <h3 className="text-xl font-bold text-gray-900">
                  {mode === 'MAKEOVER' ? 'Select Vibe' : 'Customize Items'}
                </h3>
              </div>

              {/* Item Description Input for Partial Mode */}
              {mode === 'PARTIAL' && (
                <div className="animate-fade-in mb-4">
                  <label className="block text-sm font-bold text-gray-700 mb-2">What to Add?</label>
                  <textarea
                    value={itemsToAdd}
                    onChange={(e) => { setItemsToAdd(e.target.value); clearError(); }}
                    placeholder="e.g., A large Persian rug, a standing mirror, and a plant..."
                    className="w-full p-4 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-0 outline-none min-h-[100px] text-gray-700 resize-none transition-colors text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-2 ml-1">
                    Tip: Be specific about the items.
                  </p>
                </div>
              )}

              {/* Style Selection */}
              <div className="animate-fade-in">
                  {mode === 'PARTIAL' && (
                    <label className="block text-sm font-bold text-gray-700 mb-2">Choose Item Style</label>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
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
            </section>

             {/* Action Button */}
            <div className="sticky bottom-4 z-40 lg:static pt-2">
               <Button 
                onClick={handleGenerate} 
                disabled={!originalImage || isProcessing || (mode === 'PARTIAL' && !itemsToAdd)}
                isLoading={isProcessing}
                className="w-full py-4 text-lg shadow-xl lg:shadow-lg"
              >
                {isProcessing ? processingState.message : (
                  <>
                    {mode === 'MAKEOVER' ? 'Redesign Room' : 'Add Items'} <Wand2 size={20} />
                  </>
                )}
              </Button>
            </div>
            
             {processingState.status === AppState.ERROR && (
              <div className={`p-4 rounded-xl flex flex-col gap-2 animate-fade-in ${isApiKeyError ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
                {isApiKeyError ? (
                  <div className="space-y-3">
                    <div className="flex gap-3 text-amber-800 text-sm items-start font-semibold">
                      <FileKey size={20} className="shrink-0 mt-0.5" />
                      <p>Missing API Key</p>
                    </div>
                    <p className="text-xs text-amber-700">
                      To use the AI features, you need to create a file named <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-amber-900">.env</code> in your project folder with the following content:
                    </p>
                    <div className="bg-white p-3 rounded border border-amber-200 font-mono text-xs text-gray-600 overflow-x-auto">
                      VITE_API_KEY=AIzaSy...
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 text-red-700 text-sm items-start">
                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                    <p className="break-words w-full font-medium">{processingState.message}</p>
                  </div>
                )}
                
                <div className="flex gap-2 justify-end">
                   <Button 
                    variant="secondary" 
                    className="text-xs py-2 px-4 h-auto whitespace-nowrap"
                    onClick={() => { 
                      setProcessingState({ status: AppState.IDLE });
                    }}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            )}

          </div>

          {/* Right: Result Display */}
          <div className="lg:col-span-8 space-y-8">
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
                  <div className="h-[500px] flex flex-col items-center justify-center p-12 text-center text-gray-400 space-y-4 border border-gray-200 rounded-3xl bg-gray-50">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Layers className="text-gray-300" size={40} />
                    </div>
                    <p className="text-xl font-medium text-gray-500">Your masterpiece will appear here</p>
                    <p className="text-sm text-gray-400 max-w-xs">
                        Upload a photo and click "Redesign Room" to see the magic happen.
                    </p>
                  </div>
                )}
             </section>

             {/* Refinement Section (NEW) */}
             {generatedImage && (
                <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm animate-fade-in border border-gray-100">
                   <div className="flex items-center gap-3 mb-4">
                     <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                       <Sparkles size={20} />
                     </div>
                     <h3 className="text-2xl font-bold text-gray-900">Refine Result</h3>
                   </div>
                   <div className="flex flex-col sm:flex-row gap-3">
                      <input 
                        type="text" 
                        value={refinementInstruction}
                        onChange={(e) => setRefinementInstruction(e.target.value)}
                        placeholder="e.g., Make the rug blue, remove the lamp, make it brighter..."
                        className="flex-1 p-4 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-0 outline-none transition-colors"
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                      />
                      <Button 
                        onClick={handleGenerate}
                        disabled={isProcessing || !refinementInstruction.trim()}
                        isLoading={isProcessing}
                        className="shrink-0"
                      >
                        Refine Design
                      </Button>
                   </div>
                </section>
             )}

             {/* Shopping List */}
             {shoppingItems.length > 0 && (
                <section className="animate-fade-in-up">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                       <ArrowRight size={20} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">Shop the Look</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {shoppingItems.map((item, idx) => (
                      <ShoppingItem key={idx} item={item} index={idx} />
                    ))}
                  </div>
                </section>
             )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;