import React, { useState, useRef } from 'react';
import { Send, BrainCircuit, Camera, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  onAnalyze: (problem: string, image?: string) => void;
  isLoading: boolean;
}

export const MathInput: React.FC<Props> = ({ onAnalyze, isLoading }) => {
  const [input, setInput] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || image) && !isLoading) {
      onAnalyze(input, image || undefined);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto w-full"
    >
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-octopus-accent/10 mb-6 border border-octopus-accent/20">
          <BrainCircuit className="w-8 h-8 text-octopus-accent" />
        </div>
        <h1 className="text-5xl font-serif italic mb-4">Octopus</h1>
        <p className="text-zinc-400 text-lg">Paste your math problem or upload a photo. We'll break it down to its roots.</p>
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Solve for x: 2x^2 + 5x - 3 = 0"
            className="octopus-input min-h-[200px] resize-none pr-16 pt-6 text-lg font-mono"
            disabled={isLoading}
          />
          
          <div className="absolute bottom-4 right-4 flex items-center gap-2">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`p-3 rounded-xl transition-all ${image ? 'bg-octopus-accent/20 text-octopus-accent' : 'bg-white/5 text-zinc-500 hover:bg-white/10'}`}
              title="Upload photo"
            >
              <Camera className="w-6 h-6" />
            </button>

            <button
              type="submit"
              disabled={(!input.trim() && !image) || isLoading}
              className="p-3 bg-octopus-accent text-black rounded-xl hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {image && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 overflow-hidden"
            >
              <div className="relative inline-block">
                <img src={image} alt="Uploaded math" className="h-32 rounded-lg border border-white/10" />
                <button 
                  type="button"
                  onClick={() => setImage(null)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </motion.div>
  );
};
