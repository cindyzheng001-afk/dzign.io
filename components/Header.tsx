import React from 'react';
import { Sparkles } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="w-full py-6 px-4 md:px-8 bg-white border-b border-gray-100 sticky top-0 z-50 bg-opacity-90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <Sparkles size={24} />
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            dzign.io
          </h1>
        </div>
        <nav className="hidden md:flex gap-6 text-sm font-medium text-gray-500">
          <span className="text-indigo-600">Generator</span>
          <span className="hover:text-gray-900 cursor-pointer">Gallery</span>
          <span className="hover:text-gray-900 cursor-pointer">About</span>
        </nav>
      </div>
    </header>
  );
};