import React from 'react';
import { ArrowLeft, CheckCircle2, Lightbulb } from 'lucide-react';
import { SolutionStep, Prerequisite } from '../types';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';

interface Props {
  originalProblem: string;
  similarProblem: string;
  steps: SolutionStep[];
  prerequisites: Prerequisite[];
  onBack: () => void;
}

export const SolutionStepByStep: React.FC<Props> = ({ originalProblem, similarProblem, steps, prerequisites, onBack }) => {
  const getPrerequisiteLabel = (id: string) => {
    const findLabel = (nodes: Prerequisite[]): string | undefined => {
      for (const node of nodes) {
        if (node.id === id) return node.label;
        if (node.children) {
          const found = findLabel(node.children);
          if (found) return found;
        }
      }
      return undefined;
    };
    return findLabel(prerequisites) || id;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto w-full space-y-8"
    >
      <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
        <ArrowLeft className="w-5 h-5" />
        Back to Map
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 border-octopus-accent/20">
          <h3 className="text-xs font-mono uppercase tracking-widest text-octopus-accent mb-2">Your Problem</h3>
          <p className="text-lg font-mono">{originalProblem}</p>
        </div>
        <div className="glass-panel p-6 border-blue-500/20">
          <h3 className="text-xs font-mono uppercase tracking-widest text-blue-400 mb-2">Similar Example</h3>
          <p className="text-lg font-mono">{similarProblem}</p>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-3xl font-serif italic">Step-by-Step Walkthrough</h2>
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex gap-6"
          >
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-octopus-accent/10 border border-octopus-accent/20 flex items-center justify-center text-octopus-accent font-mono">
                {i + 1}
              </div>
              {i < steps.length - 1 && <div className="w-px flex-1 bg-octopus-border my-2" />}
            </div>
            
            <div className="flex-1 glass-panel p-6 mb-4">
              <div className="flex flex-wrap gap-2 mb-4">
                {step.prerequisiteIds.map(pid => (
                  <span key={pid} className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-tighter bg-octopus-accent/10 text-octopus-accent border border-octopus-accent/20 px-2 py-0.5 rounded">
                    <CheckCircle2 className="w-3 h-3" />
                    {getPrerequisiteLabel(pid)}
                  </span>
                ))}
              </div>
              
              <div className="text-xl font-mono mb-3 text-octopus-accent">
                {step.step}
              </div>
              
              <div className="prose prose-invert prose-sm max-w-none text-zinc-400">
                <ReactMarkdown>{step.explanation}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="glass-panel p-8 bg-octopus-accent/5 border-octopus-accent/20 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-octopus-accent/10 mb-4">
          <Lightbulb className="w-6 h-6 text-octopus-accent" />
        </div>
        <h3 className="text-xl font-medium mb-2">Ready to solve yours?</h3>
        <p className="text-zinc-400 mb-6">You've mastered the prerequisites and seen a similar solution. Now apply the same logic to your original problem.</p>
        <button onClick={() => window.location.reload()} className="octopus-button">
          Start New Problem
        </button>
      </div>
    </motion.div>
  );
};
