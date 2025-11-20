import React from 'react';
import { DesignStyle } from '../types';
import { CheckCircle2 } from 'lucide-react';

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
        relative cursor-pointer group rounded-xl p-4 border-2 transition-all duration-200 overflow-hidden
        ${isSelected 
          ? 'border-indigo-600 bg-indigo-50 shadow-md' 
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
        }
      `}
    >
      {isSelected && (
        <div className="absolute top-2 right-2 text-indigo-600">
          <CheckCircle2 size={20} fill="currentColor" className="text-white" />
        </div>
      )}
      
      <div className={`w-12 h-12 rounded-full mb-3 flex items-center justify-center text-white font-bold text-lg ${style.color}`}>
        {style.label.charAt(0)}
      </div>
      
      <h3 className={`font-bold mb-1 ${isSelected ? 'text-indigo-900' : 'text-gray-800'}`}>
        {style.label}
      </h3>
      <p className={`text-xs leading-relaxed ${isSelected ? 'text-indigo-700' : 'text-gray-500'}`}>
        {style.description}
      </p>
    </div>
  );
};