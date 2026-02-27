import React, { useState } from 'react';
import { Send, BrainCircuit } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  onAnalyze: (problem: string) => void;
  isLoading: boolean;
}

export const MathInput: React.FC<Props> = ({ onAnalyze, isLoading }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onAnalyze(input);
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
        <p className="text-zinc-400 text-lg">Paste your math problem. We'll break it down to its roots.</p>
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Solve for x: 2x^2 + 5x - 3 = 0"
          className="octopus-input min-h-[200px] resize-none pr-16 pt-6 text-lg font-mono"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="absolute bottom-4 right-4 p-3 bg-octopus-accent text-black rounded-xl hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-6 h-6" />
          )}
        </button>
      </form>
    </motion.div>
  );
};
