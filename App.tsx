import React, { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { Button } from './components/Button';
import { ImageUploader } from './components/ImageUploader';
import { StyleCard } from './components/StyleCard';
import { ShoppingItem } from './components/ShoppingItem';
import { ComparisonSlider } from './components/ComparisonSlider';
import { SavedItemsDrawer } from './components/SavedItemsDrawer';
import { DESIGN_STYLES, SURPRISE_PROMPTS, PREDEFINED_PALETTES, buildMakeoverPrompt, buildPartialPrompt, buildRefinementPrompt } from './constants';
import { AppState, FurnitureItem, ColorItem, ProcessingState, DesignMode, ChatMessage } from './types';
import { restyleRoom, mineFurnitureData } from './services/geminiService';
import { Wand2, AlertCircle, ArrowRight, Layers, Armchair, Sparkles, Palette, Dices, RotateCw, Check, Zap, Send, Loader2, MessageSquare, Undo2, Redo2 } from 'lucide-react';

const App: React.FC = () => {
  // App Data State
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  
  // History State
  const [generatedHistory, setGeneratedHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  
  // Derived State
  const generatedImage = historyIndex >= 0 ? generatedHistory[historyIndex] : null;
  
  // Mode State
  const [mode, setMode] = useState<DesignMode>('MAKEOVER');
  
  // Inputs
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(DESIGN_STYLES[0].id);
  const [itemsToAdd, setItemsToAdd] = useState<string>(""); 
  const [refinementInput, setRefinementInput] = useState<string>(""); 

  // Chat State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Data
  const [shoppingItems, setShoppingItems] = useState<FurnitureItem[]>([]);
  const [colorPalette, setColorPalette] = useState<ColorItem[]>([]);
  const [proposedPalette, setProposedPalette] = useState<{name: string, colors: ColorItem[]} | null>(null);
  
  // Saved Items State
  const [savedItems, setSavedItems] = useState<FurnitureItem[]>([]);
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState(false);

  const [processingState, setProcessingState] = useState<ProcessingState>({ status: AppState.IDLE });
  const [timer, setTimer] = useState<number>(0);
  
  // Refs
  const resultsRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat when history changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, processingState.status]);

  // Timer Effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const isProcessing = processingState.status === AppState.GENERATING || processingState.status === AppState.MINING;
    
    if (isProcessing) {
      const startTime = Date.now();
      // Reset timer visual to 0 immediately when starting fresh
      if (timer === 0 || processingState.status === AppState.GENERATING) {
         setTimer(0); 
      }
      
      interval = setInterval(() => {
        setTimer((Date.now() - startTime) / 1000);
      }, 100);
    } else {
      setTimer(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [processingState.status]);

  const clearError = () => {
    if (processingState.status === AppState.ERROR) {
      setProcessingState({ status: AppState.IDLE });
    }
  };

  const handleImageUpload = (base64: string) => {
    setOriginalImage(base64);
    setGeneratedHistory([]);
    setHistoryIndex(-1);
    setShoppingItems([]);
    setColorPalette([]);
    setProposedPalette(null);
    setChatHistory([]);
    setProcessingState({ status: AppState.IDLE });
    setRefinementInput("");
  };

  const handleModeChange = (newMode: DesignMode) => {
    setMode(newMode);
    clearError();
    if (selectedStyleId === null) {
      setSelectedStyleId(DESIGN_STYLES[0].id);
      setRefinementInput("");
    }
  };

  const handleStyleChange = (id: string) => {
    setSelectedStyleId(id);
    if (selectedStyleId === null) {
      setRefinementInput("");
    }
    clearError();
  };

  const handleSurpriseMe = () => {
    if (mode === 'PARTIAL') return;
    setSelectedStyleId(null);
    const randomTwist = SURPRISE_PROMPTS[Math.floor(Math.random() * SURPRISE_PROMPTS.length)];
    setRefinementInput(randomTwist);
  };

  const handleGeneratePalette = () => {
    const random = PREDEFINED_PALETTES[Math.floor(Math.random() * PREDEFINED_PALETTES.length)];
    setProposedPalette(random);
  };

  const handleApplyPalette = () => {
    if (!proposedPalette) return;
    const colorNames = proposedPalette.colors.map(c => c.name).join(", ");
    const newInstruction = `Change the room's color scheme to use this palette: ${colorNames}. Update rugs, cushions, wall art, and decor to match these colors.`;
    handleGenerate(true, newInstruction);
  };

  const handleSendChat = () => {
    if (!refinementInput.trim()) return;
    handleGenerate(true, refinementInput);
    setRefinementInput("");
  };

  const handleToggleSaveItem = (item: FurnitureItem) => {
    setSavedItems(prev => {
      const isExists = prev.some(i => i.id === item.id);
      if (isExists) {
        return prev.filter(i => i.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  // Update a link for an item (works in both shopping list and saved list)
  const handleUpdateItemLink = (itemId: string, newLink: string) => {
    // Helper to update specific list
    const updateList = (list: FurnitureItem[]) => 
      list.map(item => item.id === itemId ? { ...item, link: newLink } : item);

    setShoppingItems(prev => updateList(prev));
    setSavedItems(prev => updateList(prev));
  };

  const handleAddCustomItem = (newItem: FurnitureItem) => {
     setSavedItems(prev => [newItem, ...prev]);
  };

  const handleGenerate = async (isRefinement: boolean = false, overrideInstruction?: string) => {
    if (!originalImage) return;

    const currentInstruction = overrideInstruction !== undefined ? overrideInstruction : refinementInput;
    const canRefine = isRefinement && generatedImage && currentInstruction;
    const sourceImage = canRefine ? generatedImage : originalImage;

    // Chat Logic: Add User Message
    if (isRefinement && currentInstruction) {
      setChatHistory(prev => [
        ...prev, 
        { id: Date.now().toString(), role: 'user', text: currentInstruction, timestamp: Date.now() }
      ]);
    } else {
      // New Generation: Reset Chat
      let startMsg = "";
      if (mode === 'MAKEOVER') {
         const styleName = DESIGN_STYLES.find(s => s.id === selectedStyleId)?.label || "Custom Style";
         startMsg = `Generating a ${styleName} makeover...`;
      } else {
         startMsg = `Adding items: ${itemsToAdd}`;
      }
      setChatHistory([
        { id: Date.now().toString(), role: 'assistant', text: startMsg, timestamp: Date.now() }
      ]);
    }

    const msg = canRefine 
      ? "Refining..." 
      : (mode === 'MAKEOVER' ? "Reimagining..." : "Adding items...");
      
    setProcessingState({ status: AppState.GENERATING, message: msg });
    
    try {
      let prompt = "";
      
      if (canRefine) {
        prompt = buildRefinementPrompt(currentInstruction);
      } else {
        let styleLabel = "Modern Minimalist"; 
        if (selectedStyleId) {
          const selectedStyle = DESIGN_STYLES.find(s => s.id === selectedStyleId);
          if (selectedStyle) styleLabel = selectedStyle.label;
        } else {
          styleLabel = currentInstruction || "Eclectic Unique Design";
        }
        
        if (mode === 'MAKEOVER') {
          prompt = buildMakeoverPrompt(styleLabel, currentInstruction);
        } else {
          if (!itemsToAdd) {
             setProcessingState({ status: AppState.ERROR, message: "Please tell us what items you want to add." });
             return;
          }
          prompt = buildPartialPrompt(itemsToAdd, styleLabel, currentInstruction);
        }
      }

      const newImage = await restyleRoom(sourceImage!, prompt);
      
      // Update History
      setGeneratedHistory(prev => {
        // Truncate history if we are in the middle of the timeline
        const currentHistory = prev.slice(0, historyIndex + 1);
        return [...currentHistory, newImage];
      });
      setHistoryIndex(prev => prev + 1);

      // Chat Logic: Add Assistant Success Message
      if (isRefinement) {
        setChatHistory(prev => [
          ...prev, 
          { id: Date.now().toString(), role: 'assistant', text: "I've updated the design based on your request.", timestamp: Date.now() }
        ]);
      } else {
        setChatHistory(prev => [
          ...prev, 
          { id: Date.now().toString(), role: 'assistant', text: "Here is your new design! You can refine it further by chatting below.", timestamp: Date.now() }
        ]);
      }

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);

      setProcessingState({ status: AppState.MINING, message: "Curating..." });
      
      const miningFocus = currentInstruction || (mode === 'PARTIAL' ? itemsToAdd : undefined);
      const { furniture, palette } = await mineFurnitureData(newImage, miningFocus);
      
      setShoppingItems(furniture);
      setColorPalette(palette);
      setProposedPalette(null);
      setProcessingState({ status: AppState.COMPLETE });
    } catch (error) {
      console.error(error);
      let errorMessage = "Oops! The AI had a creative block.";
      if (error instanceof Error) {
        if (error.message.toLowerCase().includes("503") || error.message.toLowerCase().includes("overloaded")) {
           errorMessage = "Service Busy. Please try again.";
        } else {
           errorMessage = `Error: ${error.message}`;
        }
      }
      setProcessingState({ status: AppState.ERROR, message: errorMessage });
      setChatHistory(prev => [
        ...prev, 
        { id: Date.now().toString(), role: 'assistant', text: `Failed: ${errorMessage}`, timestamp: Date.now() }
      ]);
    }
  };

  const isProcessing = processingState.status === AppState.GENERATING || processingState.status === AppState.MINING;
  const displayPalette = proposedPalette ? proposedPalette.colors : colorPalette;
  const paletteTitle = proposedPalette ? `Preview: ${proposedPalette.name}` : "Color Palette";

  return (
    <div className="min-h-screen text-gray-800 selection:bg-indigo-100 selection:text-indigo-900 pb-20">
      <Header 
        savedCount={savedItems.length} 
        onOpenSaved={() => setIsSavedDrawerOpen(true)} 
      />
      
      <SavedItemsDrawer 
        isOpen={isSavedDrawerOpen} 
        onClose={() => setIsSavedDrawerOpen(false)}
        savedItems={savedItems}
        onToggleSave={handleToggleSaveItem}
        onUpdateLink={handleUpdateItemLink}
        onAddItem={handleAddCustomItem}
      />

      <main className="max-w-7xl mx-auto px-4 md:px-8 pt-10 md:pt-14 space-y-16">
        
        {/* Hero Section */}
        <div className="text-center space-y-6 max-w-4xl mx-auto animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-indigo-100 shadow-sm text-xs font-bold text-indigo-600 mb-2 uppercase tracking-wider">
             <Zap size={14} className="fill-indigo-600" />
             AI-Powered Interior Design
          </div>
          <h2 className="text-5xl md:text-7xl font-bold text-gray-900 tracking-tight leading-[1.1]">
            Redesign your room in <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-500">seconds.</span>
          </h2>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed font-light">
            Upload a photo, choose a style, and watch as AI transforms your space while keeping its structure intact.
          </p>
        </div>

        {/* --- CONTROL PANEL --- */}
        <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-6 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white ring-1 ring-gray-100 animate-fade-in-up">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-14">
            
            {/* Left Column: Upload */}
            <div className="lg:col-span-5 space-y-6">
              <div className="flex items-center gap-4">
                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 text-white font-bold text-sm shadow-md">1</span>
                <h3 className="text-2xl font-bold text-gray-900">Your Space</h3>
              </div>
              <ImageUploader 
                currentImage={originalImage} 
                onImageUpload={handleImageUpload} 
              />
            </div>

            {/* Right Column: Controls */}
            <div className="lg:col-span-7 flex flex-col gap-10">
              
              {/* Step 2: Goal */}
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 text-white font-bold text-sm shadow-md">2</span>
                  <h3 className="text-2xl font-bold text-gray-900">Your Goal</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleModeChange('MAKEOVER')}
                    className={`p-6 rounded-2xl border-2 text-left transition-all duration-300 group ${
                      mode === 'MAKEOVER' 
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-lg shadow-indigo-100' 
                        : 'border-gray-100 bg-white hover:border-indigo-200 hover:shadow-md'
                    }`}
                  >
                    <div className={`p-3 rounded-xl w-fit mb-4 transition-colors ${mode === 'MAKEOVER' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                      <Layers size={24} />
                    </div>
                    <div className={`font-bold text-lg mb-1 ${mode === 'MAKEOVER' ? 'text-indigo-900' : 'text-gray-900'}`}>Full Makeover</div>
                    <div className="text-sm text-gray-500 font-medium">Redesign the entire style</div>
                  </button>
                  
                  <button
                    onClick={() => handleModeChange('PARTIAL')}
                    className={`p-6 rounded-2xl border-2 text-left transition-all duration-300 group ${
                      mode === 'PARTIAL' 
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-lg shadow-indigo-100' 
                        : 'border-gray-100 bg-white hover:border-indigo-200 hover:shadow-md'
                    }`}
                  >
                     <div className={`p-3 rounded-xl w-fit mb-4 transition-colors ${mode === 'PARTIAL' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                      <Armchair size={24} />
                    </div>
                    <div className={`font-bold text-lg mb-1 ${mode === 'PARTIAL' ? 'text-indigo-900' : 'text-gray-900'}`}>Add Items</div>
                    <div className="text-sm text-gray-500 font-medium">Keep walls, add furniture</div>
                  </button>
                </div>
              </div>

              {/* Step 3: Vibe */}
              <div className="space-y-6 flex-1">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 text-white font-bold text-sm shadow-md">3</span>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {mode === 'MAKEOVER' ? 'The Vibe' : 'The Items'}
                    </h3>
                  </div>
                  {mode === 'MAKEOVER' && (
                    <button 
                      onClick={handleSurpriseMe}
                      className={`flex items-center justify-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 border ${
                        selectedStyleId === null 
                          ? 'bg-purple-600 text-white border-purple-600 shadow-purple-200' 
                          : 'bg-white text-purple-600 border-purple-100 hover:bg-purple-50'
                      }`}
                    >
                      <Dices size={18} /> Surprise Me
                    </button>
                  )}
                </div>

                {/* Input for Partial Mode */}
                {mode === 'PARTIAL' && (
                  <div className="animate-fade-in">
                    <textarea
                      value={itemsToAdd}
                      onChange={(e) => { setItemsToAdd(e.target.value); clearError(); }}
                      placeholder="e.g., A large velvet sofa, a modern coffee table, and a fiddle leaf fig plant..."
                      className="w-full p-5 rounded-2xl border border-gray-200 bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none min-h-[100px] text-gray-700 resize-none transition-all shadow-sm text-base placeholder:text-gray-400"
                    />
                  </div>
                )}

                {/* Style Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

              {/* Action Area */}
              <div className="pt-2">
                <Button 
                  onClick={() => handleGenerate(false)} 
                  disabled={!originalImage || isProcessing || (mode === 'PARTIAL' && !itemsToAdd)}
                  isLoading={isProcessing}
                  className="w-full text-lg shadow-xl shadow-indigo-500/20 py-5"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      {processingState.message}
                      <span className="font-mono bg-white/20 px-2 py-0.5 rounded text-sm min-w-[60px] text-center ml-1">
                        {timer.toFixed(1)}s
                      </span>
                    </span>
                  ) : (
                    <>
                      {mode === 'MAKEOVER' ? 'Generate Redesign' : 'Add Furniture'} <Wand2 size={20} className="ml-1" />
                    </>
                  )}
                </Button>
                
                {processingState.status === AppState.ERROR && (
                  <div className="mt-6 p-4 rounded-2xl flex gap-3 bg-red-50/50 border border-red-100 text-red-600 text-sm items-center animate-fade-in shadow-sm">
                    <AlertCircle size={20} className="shrink-0" />
                    <div>
                      <span className="font-bold block text-red-700">Generation Failed</span>
                      {processingState.message}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* --- RESULTS SECTION --- */}
        <div className="scroll-mt-32 pb-20" ref={resultsRef}>
           {/* Section Divider */}
           <div className="flex items-center gap-6 mb-12 opacity-40">
             <div className="h-px bg-gray-300 flex-1"></div>
             <div className="text-gray-400 font-medium uppercase tracking-widest text-sm">Results</div>
             <div className="h-px bg-gray-300 flex-1"></div>
           </div>

           {/* Results Container */}
           <section className="bg-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden">
              
              {/* Comparison Slider Area */}
              <div className="p-2 md:p-3 bg-gray-50 border-b border-gray-100">
                {generatedImage && originalImage ? (
                  <div className="space-y-4">
                    <div className="animate-fade-in rounded-[2rem] overflow-hidden shadow-inner ring-1 ring-black/5">
                      <ComparisonSlider 
                        beforeImage={originalImage} 
                        afterImage={generatedImage} 
                      />
                    </div>
                    
                    {/* History Controls */}
                    <div className="flex items-center justify-center gap-4 animate-fade-in pb-2">
                       <button 
                         onClick={() => setHistoryIndex(i => Math.max(0, i - 1))}
                         disabled={historyIndex <= 0 || isProcessing}
                         className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                         title="Revert to previous version"
                       >
                         <Undo2 size={16} /> Revert
                       </button>
                       
                       <span className="text-xs font-mono text-gray-400 font-medium bg-gray-100 px-2 py-1 rounded">
                         v{historyIndex + 1} / {generatedHistory.length}
                       </span>
                       
                       <button 
                         onClick={() => setHistoryIndex(i => Math.min(generatedHistory.length - 1, i + 1))}
                         disabled={historyIndex >= generatedHistory.length - 1 || isProcessing}
                         className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                         title="Redo changes"
                       >
                         Redo <Redo2 size={16} />
                       </button>

                       {/* New Regenerate Button */}
                       <div className="w-px h-8 bg-gray-200 mx-2"></div>

                       <button 
                         onClick={() => handleGenerate(false)}
                         disabled={isProcessing}
                         className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 text-white border border-indigo-600 text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-200 active:scale-95"
                         title="Generate a new variation"
                       >
                         <RotateCw size={16} className={isProcessing ? "animate-spin" : ""} />
                         Regenerate
                       </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-[500px] flex flex-col items-center justify-center p-12 text-center space-y-6 bg-white rounded-[2rem] border-2 border-dashed border-gray-100">
                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center animate-pulse">
                        <Layers className="text-gray-200" size={48} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Transform</h3>
                      <p className="text-gray-400 max-w-sm mx-auto">
                          Upload your room and select a style above to see the AI magic happen here.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Post-Gen Actions */}
              {generatedImage && (
                 <div className="p-8 md:p-12">
                   <div className="grid lg:grid-cols-12 gap-12">
                      
                      {/* Refine / Chat Column */}
                      <div className="lg:col-span-5 flex flex-col h-full">
                         <div className="flex items-center gap-3 mb-6">
                           <div className="p-2.5 bg-violet-100 text-violet-600 rounded-xl">
                             <MessageSquare size={22} />
                           </div>
                           <h3 className="text-2xl font-bold text-gray-900">Refine Chat</h3>
                         </div>
                         
                         {/* Chat Interface */}
                         <div className="flex flex-col h-[500px] bg-gray-50/80 rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm hover:border-violet-100 transition-colors">
                           
                           {/* Message List */}
                           <div className="flex-1 overflow-y-auto p-4 space-y-4">
                             {chatHistory.length === 0 && (
                               <div className="flex h-full flex-col items-center justify-center text-gray-400 text-center px-6">
                                  <Sparkles size={32} className="mb-2 opacity-50" />
                                  <p className="text-sm">Start chatting to refine your room design.</p>
                               </div>
                             )}

                             {chatHistory.map((msg) => (
                               <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                                 <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                   msg.role === 'user' 
                                     ? 'bg-indigo-600 text-white rounded-tr-none' 
                                     : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                                 }`}>
                                    {msg.text}
                                 </div>
                               </div>
                             ))}
                             
                             {/* Loading Bubble */}
                             {isProcessing && (
                               <div className="flex justify-start animate-fade-in">
                                 <div className="bg-white border border-gray-200 text-gray-500 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm text-sm flex items-center gap-3">
                                    <Loader2 size={16} className="animate-spin text-violet-500" />
                                    <span className="font-medium bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600">
                                      {processingState.message}
                                    </span>
                                    <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">
                                      {timer.toFixed(1)}s
                                    </span>
                                 </div>
                               </div>
                             )}
                             <div ref={chatEndRef} />
                           </div>

                           {/* Input Area */}
                           <div className="p-3 bg-white border-t border-gray-100">
                             <div className="relative flex items-center gap-2">
                               <input 
                                 value={refinementInput}
                                 onChange={(e) => setRefinementInput(e.target.value)}
                                 onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                                 placeholder="Ask for changes (e.g., 'Make the rug blue')..."
                                 disabled={isProcessing}
                                 className="w-full pl-5 pr-12 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                               />
                               <button 
                                 onClick={handleSendChat}
                                 disabled={!refinementInput.trim() || isProcessing}
                                 className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shadow-md active:scale-95"
                               >
                                 <Send size={16} />
                               </button>
                             </div>
                           </div>
                         </div>
                      </div>

                      {/* Details Column */}
                      <div className="lg:col-span-7 space-y-10">
                         
                         {/* Palette */}
                         {(colorPalette.length > 0 || proposedPalette) && (
                            <section className="bg-white">
                              <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                  <div className="p-2.5 bg-pink-100 text-pink-600 rounded-xl">
                                     <Palette size={22} />
                                  </div>
                                  <h3 className="text-2xl font-bold text-gray-900">{paletteTitle}</h3>
                                </div>
                                
                                <div className="flex gap-2">
                                   <button
                                     onClick={handleGeneratePalette}
                                     disabled={isProcessing}
                                     className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-pink-700 bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-xl transition-all active:scale-95"
                                   >
                                     <RotateCw size={14} className={isProcessing ? "animate-spin" : ""} />
                                     {proposedPalette ? "Shuffle" : "Generator"}
                                   </button>

                                   {proposedPalette && (
                                     <button
                                       onClick={handleApplyPalette}
                                       disabled={isProcessing}
                                       className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-pink-600 hover:bg-pink-700 rounded-xl transition-all shadow-lg shadow-pink-200 active:scale-95"
                                     >
                                       <Check size={14} />
                                       Apply
                                     </button>
                                   )}
                                </div>
                              </div>

                              <div className="flex gap-4 overflow-x-auto pb-2">
                                 {displayPalette.map((color, idx) => (
                                   <div key={idx} className="flex-1 min-w-[80px] group">
                                      <div 
                                        className="w-full h-24 rounded-2xl shadow-sm border border-black/5 mb-3 transition-transform group-hover:scale-105 group-hover:shadow-md relative overflow-hidden"
                                        style={{ backgroundColor: color.hex }}
                                      >
                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                      </div>
                                      <div className="text-center px-1">
                                        <p className="font-bold text-gray-900 text-xs truncate mb-0.5">{color.name}</p>
                                        <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wide">{color.hex}</p>
                                      </div>
                                   </div>
                                 ))}
                              </div>
                            </section>
                         )}

                         <div className="h-px bg-gray-100"></div>

                         {/* Shopping List */}
                         {shoppingItems.length > 0 && (
                            <section>
                              <div className="flex items-center gap-3 mb-6">
                                <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
                                   <ArrowRight size={22} />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">Shop Items</h3>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {shoppingItems.map((item, idx) => (
                                  <ShoppingItem 
                                    key={item.id} 
                                    item={item} 
                                    index={idx} 
                                    isSaved={savedItems.some(i => i.id === item.id)}
                                    onToggleSave={() => handleToggleSaveItem(item)}
                                    onUpdateLink={handleUpdateItemLink}
                                  />
                                ))}
                              </div>
                            </section>
                         )}
                      </div>
                   </div>
                 </div>
              )}
           </section>
        </div>
      </main>
    </div>
  );
};

export default App;