import React, { useRef } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';

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
          className="w-full h-64 md:h-80 border-3 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-gray-50 transition-colors group"
        >
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Upload className="text-indigo-600" size={32} />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Upload your room</h3>
          <p className="text-gray-500 text-sm text-center max-w-xs">
            Click to select a JPG or PNG photo of your interior space.
          </p>
        </div>
      ) : (
        <div className="relative w-full rounded-2xl overflow-hidden shadow-md group bg-gray-900">
          <img 
            src={currentImage} 
            alt="Uploaded Room" 
            className="w-full h-auto max-h-[500px] object-contain block"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
             <button 
                onClick={triggerInput}
                className="bg-white/20 backdrop-blur-md border border-white/50 text-white px-4 py-2 rounded-full hover:bg-white/30 transition-colors font-medium flex items-center gap-2"
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
