import React from 'react';
import { CheckCircle2, Circle, ChevronRight, BookOpen } from 'lucide-react';
import { Prerequisite } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  prerequisites: Prerequisite[];
  onToggle: (id: string) => void;
  onLearn: (id: string) => void;
  onProceed: () => void;
}

export const PrerequisiteTree: React.FC<Props> = ({ prerequisites, onToggle, onLearn, onProceed }) => {
  const allCompleted = prerequisites.every(p => 
    p.completed && (!p.children || p.children.every(c => c.completed))
  );

  const renderNode = (node: Prerequisite, depth = 0) => (
    <div key={node.id} className={cn("mb-4", depth > 0 && "ml-8 border-l border-octopus-border pl-6")}>
      <div className="flex items-start gap-4 group">
        <button 
          onClick={() => onToggle(node.id)}
          className="mt-1 text-octopus-accent hover:scale-110 transition-transform"
        >
          {node.completed ? (
            <CheckCircle2 className="w-6 h-6 fill-octopus-accent text-black" />
          ) : (
            <Circle className="w-6 h-6" />
          )}
        </button>
        
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className={cn(
              "text-lg font-medium transition-colors",
              node.completed ? "text-zinc-500 line-through" : "text-white"
            )}>
              {node.label}
            </h3>
            {!node.completed && (
              <button 
                onClick={() => onLearn(node.id)}
                className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs font-mono uppercase tracking-wider text-octopus-accent bg-octopus-accent/10 px-2 py-1 rounded border border-octopus-accent/20 transition-all"
              >
                <BookOpen className="w-3 h-3" />
                Learn
              </button>
            )}
          </div>
          <p className="text-sm text-zinc-400 mb-4">{node.description}</p>
          
          {node.children && (
            <div className="mt-2">
              {node.children.map(child => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-3xl mx-auto w-full"
    >
      <div className="mb-12 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif italic mb-2">Prerequisite Map</h2>
          <p className="text-zinc-400">Master these concepts to solve your problem.</p>
        </div>
        <AnimatePresence>
          {allCompleted && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={onProceed}
              className="octopus-button flex items-center gap-2"
            >
              Solve Similar Problem
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="glass-panel p-8">
        {prerequisites.map(p => renderNode(p))}
      </div>
    </motion.div>
  );
};
