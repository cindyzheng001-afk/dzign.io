import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Button } from './components/Button';
import { ImageUploader } from './components/ImageUploader';
import { StyleCard } from './components/StyleCard';
import { ShoppingItem } from './components/ShoppingItem';
import { ComparisonSlider } from './components/ComparisonSlider';
import { DESIGN_STYLES, buildMakeoverPrompt, buildPartialPrompt } from './constants';
import { AppState, FurnitureItem, ProcessingState, DesignMode } from './types';
import { restyleRoom, mineFurnitureData } from './services/geminiService';
import { Wand2, AlertCircle, ArrowRight, Layers, Armchair, RefreshCw, Sparkles } from 'lucide-react';

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

  // API Key State
  const [isKeySelected, setIsKeySelected] = useState<boolean>(false);
  const [isCheckingKey, setIsCheckingKey] = useState<boolean>(true);

  useEffect(() => {
    const checkKey = async () => {
      // 1. Check if the API key is already available in the environment (e.g. from .env file)
      // We prioritize this to allow users to simply provide their key and skip the UI picker.
      if (process.env.API_KEY && process.env.API_KEY.trim() !== '') {
        setIsKeySelected(true);
        setIsCheckingKey(false);
        return;
      }

      // 2. If no environment key, check AI Studio integration
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsKeySelected(hasKey);
      } else {
        // No key in env, and no platform integration
        setIsKeySelected(false);
      }
      setIsCheckingKey(false);
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      // Mitigate race condition by assuming success immediately after user action
      setIsKeySelected(true);
    } else {
      // Local dev fallback helper
      alert("No AI Studio environment detected. Please ensure VITE_API_KEY is set in your .env file.");
    }
  };

  const handleImageUpload = (base64: string) => {
    setOriginalImage(base64);
    setGeneratedImage(null);
    setShoppingItems([]);
    setProcessingState({ status: AppState.IDLE });
    setRefinementInstruction("");
  };

  const handleGenerate = async () => {
    if (!originalImage) return;

    setProcessingState({ status: AppState.GENERATING, message: mode === 'MAKEOVER' ? "Reimagining your space..." : "Adding your items..." });
    setGeneratedImage(null);
    setShoppingItems([]);

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
          errorMessage = "Config Error: API Key not found. Please ensure 'API_KEY' or 'VITE_API_KEY' is set in your environment variables or .env file.";
        } else if (lowerMsg.includes("requested entity was not found")) {
           // Specific handling for invalid session/key in AI Studio
           setIsKeySelected(false);
           errorMessage = "Session expired. Please connect your API Key again.";
        } else if (lowerMsg.includes("403") || lowerMsg.includes("api key")) {
           errorMessage = "Access Denied: The provided API Key is invalid or expired. Please check your configuration.";
        } else if (lowerMsg.includes("503") || lowerMsg.includes("overloaded")) {
           errorMessage = "Service Overloaded: The AI is busy. Please try again in a moment.";
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

  const handleRefine = () => {
    handleGenerate();
  };

  const isProcessing = processingState.status === AppState.GENERATING || processingState.status === AppState.MINING;

  if (isCheckingKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isKeySelected) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-indigo-200">
          <Sparkles size={40} className="text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">Welcome to dzign.io</h1>
        <p className="text-lg text-gray-600 max-w-md mb-10 leading-relaxed">
          Experience AI-powered interior design. Please connect your Google account to access the Gemini API and start creating.
        </p>
        <Button onClick={handleSelectKey} className="w-full max-w-sm py-4 text-lg">
          Connect API Key
          <ArrowRight size={20} />
        </Button>
        <p className="mt-8 text-sm text-gray-400">
          Powered by Google Gemini
        </p>
      </div>
    );
  }

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
                  onClick={() => setMode('MAKEOVER')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${mode === 'MAKEOVER' ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : 'border-gray-200 bg-white hover:border-gray-300 text-gray-600'}`}
                >
                  <Layers className="mb-2" size={24} />
                  <div className="font-bold text-sm">Redecorate Room</div>
                  <div className="text-xs opacity-70 mt-1">Full style makeover</div>
                </button>
                
                <button
                  onClick={() => setMode('PARTIAL')}
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
                    onChange={(e) => setItemsToAdd(e.target.value)}
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
                        onClick={() => setSelectedStyleId(style.id)}
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
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3 text-red-700 text-sm items-start animate-fade-in">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <p className="break-words w-full font-medium">{processingState.message}</p>
                <Button 
                  variant="secondary" 
                  className="text-xs py-1 px-3 h-auto ml-auto whitespace-nowrap"
                  onClick={() => { 
                    setProcessingState({ status: AppState.IDLE });
                  }}
                >
                  Dismiss
                </Button>
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
                    {isProcessing ? (
                      <>
                        <div className="relative w-24 h-24">
                          <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                          <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                        </div>
                        <p className="animate-pulse font-medium text-indigo-600">{processingState.message}</p>
                      </>
                    ) : (
                      <>
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-2 shadow-sm">
                          <Wand2 size={32} className="text-gray-300" />
                        </div>
                        <p className="text-lg font-medium text-gray-500">Your new room awaits.</p>
                        <p className="text-sm">Upload a photo and click Generate to see the magic.</p>
                      </>
                    )}
                  </div>
                )}
             </section>

             {/* Post-Generation Refinement */}
             {generatedImage && (
               <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm animate-fade-in-up">
                 <div className="flex items-center gap-2 mb-4 text-gray-900 font-bold">
                    <RefreshCw size={20} className="text-indigo-600" />
                    <h3>Refine Result</h3>
                 </div>
                 <div className="flex gap-3 flex-col sm:flex-row">
                   <input 
                    type="text"
                    value={refinementInstruction}
                    onChange={(e) => setRefinementInstruction(e.target.value)}
                    placeholder={mode === 'MAKEOVER' ? "e.g., Make the sofa green, change rug to beige..." : "e.g., Move the plant to the left, make the mirror round..."}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                   />
                   <Button 
                    variant="secondary" 
                    onClick={handleRefine} 
                    disabled={isProcessing || !refinementInstruction.trim()}
                    className="whitespace-nowrap"
                   >
                     Update Design
                   </Button>
                 </div>
               </section>
             )}

             {/* Data Mining Results: Shopping List */}
             {shoppingItems.length > 0 && (
               <section className="animate-fade-in-up">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                       <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">4</span>
                       <h3 className="text-2xl font-bold text-gray-900">Shop the Look</h3>
                    </div>
                    <span className="text-sm text-gray-500 hidden sm:inline">
                       {mode === 'PARTIAL' ? 'Items you added' : 'AI-identified items'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {shoppingItems.map((item, index) => (
                      <ShoppingItem key={index} item={item} index={index} />
                    ))}
                  </div>

                  <div className="mt-6 p-6 bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
                    <div>
                      <h4 className="font-bold text-lg">Want to try another style?</h4>
                      <p className="text-indigo-100 text-sm">Scroll up to change the vibe or items.</p>
                    </div>
                    <button 
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      className="bg-white text-indigo-700 px-6 py-2 rounded-full font-bold hover:bg-indigo-50 transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                      Scroll Up <ArrowRight size={16} />
                    </button>
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