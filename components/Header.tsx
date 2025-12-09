import React from 'react';
import { Sparkles, Heart } from 'lucide-react';

interface HeaderProps {
  savedCount?: number;
  onOpenSaved?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ savedCount = 0, onOpenSaved }) => {
  return (
    <header className="w-full py-5 px-6 border-b border-gray-100 sticky top-0 z-40 bg-white/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 group cursor-pointer">
          <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl text-white shadow-lg shadow-indigo-200 transition-transform group-hover:scale-105 group-active:scale-95">
            <Sparkles size={20} className="fill-white/20" />
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight">
            dzign.io
          </h1>
        </div>
        <nav className="flex items-center gap-4 md:gap-8 text-sm font-medium text-gray-500">
          <span className="hidden md:inline text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Generator</span>
          <span className="hidden md:inline hover:text-gray-900 cursor-pointer transition-colors">Gallery</span>
          
          <button 
            onClick={onOpenSaved}
            className="flex items-center gap-2 hover:text-pink-600 transition-colors relative group"
            title="View Saved Items"
          >
            <Heart size={20} className={`group-hover:fill-pink-100 ${savedCount > 0 ? 'text-pink-600 fill-pink-600' : ''}`} />
            <span className="hidden md:inline">Saved</span>
            {savedCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-pink-600 text-white text-[10px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center shadow-sm">
                {savedCount}
              </span>
            )}
          </button>

          <button className="hidden md:block text-xs font-bold bg-gray-900 text-white px-4 py-2 rounded-full hover:bg-gray-800 transition-colors">
            Sign In
          </button>
        </nav>
      </div>
    </header>
  );
};