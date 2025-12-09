import React, { useRef } from 'react';
import { Upload, Image as ImageIcon, Sparkles } from 'lucide-react';

interface ImageUploaderProps {
  currentImage: string | null;
  onImageUpload: (base64: string) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ currentImage, onImageUpload }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onImageUpload(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerInput = () => {
    inputRef.current?.click();
  };

  return (
    <div className="w-full">
      <input 
        type="file" 
        ref={inputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      
      {!currentImage ? (
        <div 
          onClick={triggerInput}
          className="w-full h-80 border-2 border-dashed border-indigo-100 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all duration-300 group relative overflow-hidden bg-white"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-white via-transparent to-indigo-50/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-indigo-100 transition-all shadow-sm z-10">
            <Upload className="text-indigo-600" size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2 z-10">Upload your room</h3>
          <p className="text-gray-500 text-sm text-center max-w-xs px-4 leading-relaxed z-10">
            Click to select a photo. <br/>For best results, use a well-lit wide angle shot.
          </p>
        </div>
      ) : (
        <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl shadow-indigo-900/10 group bg-gray-900 ring-4 ring-white">
          <img 
            src={currentImage} 
            alt="Uploaded Room" 
            className="w-full h-auto max-h-[500px] object-cover block opacity-90 group-hover:opacity-60 transition-opacity duration-300"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0">
             <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-full mb-4 border border-white/20">
               <Sparkles className="text-white" size={24} />
             </div>
             <button 
                onClick={triggerInput}
                className="bg-white text-gray-900 px-6 py-3 rounded-full hover:bg-gray-100 transition-colors font-bold shadow-lg flex items-center gap-2 transform hover:scale-105 active:scale-95 duration-200"
             >
               <ImageIcon size={18} />
               Change Photo
             </button>
          </div>
        </div>
      )}
    </div>
  );
};