import React, { useState, useRef, useEffect } from 'react';
import { MoveHorizontal, Download } from 'lucide-react';

interface ComparisonSliderProps {
  beforeImage: string;
  afterImage: string;
}

export const ComparisonSlider: React.FC<ComparisonSliderProps> = ({ beforeImage, afterImage }) => {
  const [isResizing, setIsResizing] = useState(false);
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const newPos = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setPosition(newPos);
    }
  };

  const onMouseMove = (e: MouseEvent | TouchEvent) => {
    if (!isResizing) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    handleMove(clientX);
  };

  const onMouseUp = () => setIsResizing(false);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onMouseMove);
      window.addEventListener('touchend', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onMouseMove);
      window.removeEventListener('touchend', onMouseUp);
    };
  }, [isResizing]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[300px] md:h-[500px] bg-gray-900 overflow-hidden rounded-lg md:rounded-2xl select-none cursor-col-resize group shadow-2xl"
      onMouseDown={(e) => { setIsResizing(true); handleMove(e.clientX); }}
      onTouchStart={(e) => { setIsResizing(true); handleMove(e.touches[0].clientX); }}
    >
      {/* After Image (Background Layer) */}
      <img 
        src={afterImage} 
        alt="After Design" 
        className="absolute inset-0 w-full h-full object-contain pointer-events-none" 
      />
      <div className="absolute top-4 right-4 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full z-10 shadow-lg">
        AFTER
      </div>

      {/* Before Image (Top Layer - Clipped) */}
      <div 
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img 
          src={beforeImage} 
          alt="Before Design" 
          className="absolute inset-0 w-full h-full object-contain" 
        />
        <div className="absolute top-4 left-4 bg-black/70 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full z-10">
          BEFORE
        </div>
      </div>

      {/* Handle */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white cursor-col-resize z-20 flex items-center justify-center hover:bg-indigo-400 transition-colors"
        style={{ left: `${position}%` }}
      >
        <div className="w-8 h-8 bg-white rounded-full shadow-xl flex items-center justify-center -ml-[15px] border-2 border-gray-100">
           <MoveHorizontal size={16} className="text-indigo-600" />
        </div>
      </div>

      {/* Download Button */}
      <div className="absolute bottom-4 right-4 z-30">
         <a 
           href={afterImage} 
           download="vibe-refine-design.png" 
           className="bg-black/60 hover:bg-black/80 backdrop-blur text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all pointer-events-auto"
           onClick={(e) => e.stopPropagation()}
         >
           <Download size={14} />
           Download HD
         </a>
      </div>
    </div>
  );
};