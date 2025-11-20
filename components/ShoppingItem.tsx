import React from 'react';
import { FurnitureItem } from '../types';
import { ExternalLink, Search } from 'lucide-react';

interface ShoppingItemProps {
  item: FurnitureItem;
  index: number;
}

export const ShoppingItem: React.FC<ShoppingItemProps> = ({ item, index }) => {
  const googleShoppingUrl = `https://www.google.com/search?q=${encodeURIComponent(item.searchQuery)}&tbm=shop`;

  return (
    <a 
      href={googleShoppingUrl} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block group"
    >
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 transform scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom duration-300"></div>
        
        <div className="flex justify-between items-start mb-2">
          <span className="inline-block px-2 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded uppercase tracking-wider">
            0{index + 1}
          </span>
          <ExternalLink size={16} className="text-gray-300 group-hover:text-indigo-600 transition-colors" />
        </div>
        
        <h4 className="font-bold text-gray-900 text-lg mb-1 line-clamp-1 group-hover:text-indigo-700 transition-colors">
          {item.itemName}
        </h4>
        
        <p className="text-sm text-gray-500 mb-4 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-gray-200 inline-block"></span>
          {item.color}
        </p>
        
        <div className="flex items-center text-sm font-medium text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
          <Search size={14} className="mr-1" />
          Find on Google
        </div>
      </div>
    </a>
  );
};