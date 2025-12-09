import React, { useState } from 'react';
import { FurnitureItem } from '../types';
import { Search, Heart, Link as LinkIcon, Check, X, ExternalLink } from 'lucide-react';

interface ShoppingItemProps {
  item: FurnitureItem;
  index: number;
  isSaved?: boolean;
  onToggleSave?: () => void;
  onUpdateLink?: (itemId: string, link: string) => void;
}

export const ShoppingItem: React.FC<ShoppingItemProps> = ({ 
  item, 
  index, 
  isSaved = false, 
  onToggleSave,
  onUpdateLink 
}) => {
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [linkInput, setLinkInput] = useState(item.link || "");

  const googleShoppingUrl = `https://www.google.com/search?q=${encodeURIComponent(item.searchQuery)}&tbm=shop`;
  const finalUrl = item.link && item.link.trim() !== "" ? item.link : googleShoppingUrl;
  const hasCustomLink = !!(item.link && item.link.trim() !== "");

  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleSave?.();
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditingLink(true);
    setLinkInput(item.link || "");
  };

  const handleSaveLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onUpdateLink) {
        onUpdateLink(item.id, linkInput);
    }
    setIsEditingLink(false);
  };

  const handleCancelLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditingLink(false);
  };

  return (
    <div className="block group relative">
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden h-full flex flex-col">
        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 transform scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom duration-300"></div>
        
        {/* Actions Container */}
        <div className="absolute top-4 right-4 z-20 flex gap-2">
            {/* Link Edit Button */}
            <button 
                onClick={handleLinkClick}
                className={`p-2 rounded-full bg-white/80 backdrop-blur shadow-sm hover:scale-110 active:scale-95 transition-all border ${hasCustomLink ? 'border-indigo-200 text-indigo-600' : 'border-transparent text-gray-400 hover:text-indigo-600'}`}
                title="Add product link"
            >
                <LinkIcon size={16} />
            </button>

            {/* Save Button */}
            <button 
            onClick={handleSaveClick}
            className="p-2 rounded-full bg-white/80 backdrop-blur shadow-sm hover:scale-110 active:scale-95 transition-all group/btn border border-transparent hover:border-pink-100"
            title={isSaved ? "Remove from saved" : "Save item"}
            >
            <Heart 
                size={16} 
                className={`transition-colors duration-300 ${
                isSaved 
                ? "fill-pink-500 text-pink-500" 
                : "text-gray-400 group-hover/btn:text-pink-500"
                }`} 
            />
            </button>
        </div>

        {/* Link Editor Overlay */}
        {isEditingLink && (
            <div className="absolute inset-0 z-30 bg-white/95 backdrop-blur-sm p-4 flex flex-col justify-center animate-fade-in" onClick={(e) => e.stopPropagation()}>
                <label className="text-xs font-bold text-gray-500 mb-1 uppercase">Paste Product URL</label>
                <div className="flex gap-2">
                    <input 
                        type="url"
                        value={linkInput}
                        onChange={(e) => setLinkInput(e.target.value)}
                        placeholder="https://..."
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button 
                        onClick={handleSaveLink}
                        className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        <Check size={16} />
                    </button>
                    <button 
                        onClick={handleCancelLink}
                        className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        )}

        {/* Card Content - Clicking body opens link */}
        <a 
            href={finalUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 flex flex-col"
        >
            <div className="flex justify-between items-start mb-2 pr-20">
            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded uppercase tracking-wider">
                0{index + 1}
            </span>
            </div>
            
            <h4 className="font-bold text-gray-900 text-lg mb-1 line-clamp-1 group-hover:text-indigo-700 transition-colors pr-8">
            {item.itemName}
            </h4>
            
            <p className="text-sm text-gray-500 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gray-200 inline-block"></span>
            {item.color}
            </p>
            
            <div className="mt-auto flex items-center text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
             {hasCustomLink ? (
                 <span className="text-indigo-600 flex items-center">
                     <ExternalLink size={14} className="mr-1" />
                     Visit Store
                 </span>
             ) : (
                <span className="text-gray-500 flex items-center hover:text-indigo-600 transition-colors">
                    <Search size={14} className="mr-1" />
                    Find on Google
                </span>
             )}
            </div>
        </a>
      </div>
    </div>
  );
};