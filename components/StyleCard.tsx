import React from 'react';
import { DesignStyle } from '../types';
import { Check } from 'lucide-react';

interface StyleCardProps {
  style: DesignStyle;
  isSelected: boolean;
  onClick: () => void;
}

export const StyleCard: React.FC<StyleCardProps> = ({ style, isSelected, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        relative cursor-pointer group rounded-2xl p-5 border transition-all duration-300 h-full flex flex-col
        ${isSelected 
          ? 'border-indigo-600 bg-white ring-4 ring-indigo-50 shadow-xl shadow-indigo-100 translate-y-[-2px]' 
          : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-lg hover:shadow-gray-100 hover:translate-y-[-2px]'
        }
      `}
    >
      {isSelected && (
        <div className="absolute top-4 right-4 text-white bg-indigo-600 rounded-full p-1 shadow-md animate-fade-in">
          <Check size={12} strokeWidth={3} />
        </div>
      )}
      
      <div className={`w-12 h-12 rounded-2xl mb-4 flex items-center justify-center text-white font-bold text-lg shadow-md ${style.color} group-hover:scale-110 transition-transform duration-300`}>
        {style.label.charAt(0)}
      </div>
      
      <h3 className={`font-bold mb-1.5 text-base ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
        {style.label}
      </h3>
      <p className="text-xs leading-relaxed text-gray-500 line-clamp-3">
        {style.description}
      </p>
    </div>
  );
};