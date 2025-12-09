import React, { useState } from 'react';
import { FurnitureItem } from '../types';
import { ShoppingItem } from './ShoppingItem';
import { X, Heart, ShoppingBag, Plus, Link as LinkIcon, ArrowRight } from 'lucide-react';

interface SavedItemsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedItems: FurnitureItem[];
  onToggleSave: (item: FurnitureItem) => void;
  onUpdateLink?: (itemId: string, link: string) => void;
  onAddItem?: (item: FurnitureItem) => void;
}

export const SavedItemsDrawer: React.FC<SavedItemsDrawerProps> = ({ 
  isOpen, 
  onClose, 
  savedItems,
  onToggleSave,
  onUpdateLink,
  onAddItem
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemLink, setNewItemLink] = useState("");

  const handleAddNew = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newItemName.trim() || !onAddItem) return;

      const newItem: FurnitureItem = {
          id: crypto.randomUUID(),
          itemName: newItemName,
          color: "Custom Item",
          searchQuery: newItemName,
          link: newItemLink
      };

      onAddItem(newItem);
      setNewItemName("");
      setNewItemLink("");
      setIsAdding(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 cubic-bezier(0.16, 1, 0.3, 1) ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-xl z-10">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-100 text-pink-600 rounded-lg">
                <Heart size={20} fill="currentColor" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Saved Items ({savedItems.length})</h2>
            </div>
            <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
            >
                <X size={20} />
            </button>
        </div>

        {/* Add Item Section */}
        <div className="p-4 bg-gray-50 border-b border-gray-100">
            {!isAdding ? (
                <button 
                    onClick={() => setIsAdding(true)}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                >
                    <Plus size={18} /> Add Custom Item
                </button>
            ) : (
                <form onSubmit={handleAddNew} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 animate-fade-in">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">New Item</span>
                        <button type="button" onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600">
                            <X size={14} />
                        </button>
                    </div>
                    <div className="space-y-3">
                        <input 
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            placeholder="Item Name (e.g., West Elm Sofa)"
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            autoFocus
                        />
                         <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                            <LinkIcon size={14} className="text-gray-400 shrink-0" />
                            <input 
                                value={newItemLink}
                                onChange={(e) => setNewItemLink(e.target.value)}
                                placeholder="Paste Link (Optional)"
                                className="w-full bg-transparent outline-none text-sm"
                            />
                        </div>
                        <button 
                            type="submit"
                            disabled={!newItemName.trim()}
                            className="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Add to List
                        </button>
                    </div>
                </form>
            )}
        </div>
        
        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
            {savedItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 space-y-4 animate-fade-in">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                    <ShoppingBag size={28} className="opacity-40" />
                    </div>
                    <div>
                    <p className="font-bold text-gray-600 mb-1">Your list is empty</p>
                    <p className="text-sm max-w-[200px] mx-auto">Heart items from your design results to save them here for later!</p>
                    </div>
                </div>
            ) : (
                <div className="grid gap-4">
                {savedItems.map((item, idx) => (
                    <div key={item.id} className="animate-fade-in-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                    <ShoppingItem 
                        item={item} 
                        index={idx} 
                        isSaved={true}
                        onToggleSave={() => onToggleSave(item)}
                        onUpdateLink={onUpdateLink}
                    />
                    </div>
                ))}
                </div>
            )}
        </div>
      </div>
    </>
  );
};