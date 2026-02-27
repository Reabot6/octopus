import { useState } from 'react';
import { MathInput } from './components/MathInput';
import { PrerequisiteTree } from './components/PrerequisiteTree';
import { InteractiveSession } from './components/InteractiveSession';
import { SolutionStepByStep } from './components/SolutionStepByStep';
import { AppState, MathProblem, Prerequisite } from './types';
import { analyzeProblem } from './services/gemini';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [state, setState] = useState<AppState>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [problem, setProblem] = useState<MathProblem | null>(null);
  const [activeConceptId, setActiveConceptId] = useState<string | null>(null);

  const handleAnalyze = async (input: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyzeProblem(input);
      setProblem({
        originalProblem: input,
        prerequisites: result.prerequisites.map(p => ({ ...p, completed: false })),
        similarProblem: result.similarProblem,
        similarSolution: result.similarSolution
      });
      setState('tree');
    } catch (err: any) {
      console.error("Analysis failed", err);
      setError(err.message || "Failed to analyze problem. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePrerequisite = (id: string) => {
    if (!problem) return;
    
    const updateNodes = (nodes: Prerequisite[]): Prerequisite[] => {
      return nodes.map(node => {
        if (node.id === id) {
          return { ...node, completed: !node.completed };
        }
        if (node.children) {
          return { ...node, children: updateNodes(node.children) };
        }
        return node;
      });
    };

    setProblem({
      ...problem,
      prerequisites: updateNodes(problem.prerequisites)
    });
  };

  const handleLearnConcept = (id: string) => {
    setActiveConceptId(id);
    setState('learning');
  };

  const handleCompleteConcept = () => {
    if (activeConceptId) {
      handleTogglePrerequisite(activeConceptId);
    }
    setState('tree');
    setActiveConceptId(null);
  };

  const getActiveConceptLabel = () => {
    if (!problem || !activeConceptId) return '';
    const findLabel = (nodes: Prerequisite[]): string | undefined => {
      for (const node of nodes) {
        if (node.id === activeConceptId) return node.label;
        if (node.children) {
          const found = findLabel(node.children);
          if (found) return found;
        }
      }
      return undefined;
    };
    return findLabel(problem.prerequisites) || '';
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-2xl mx-auto mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center text-sm flex flex-col items-center gap-2"
          >
            <p>{error}</p>
            <button 
              onClick={() => setError(null)}
              className="text-xs underline hover:text-red-300 transition-colors"
            >
              Dismiss
            </button>
          </motion.div>
        )}

        {state === 'input' && (
          <MathInput key="input" onAnalyze={handleAnalyze} isLoading={isLoading} />
        )}

        {state === 'tree' && problem && (
          <PrerequisiteTree
            key="tree"
            prerequisites={problem.prerequisites}
            onToggle={handleTogglePrerequisite}
            onLearn={handleLearnConcept}
            onProceed={() => setState('solution')}
          />
        )}

        {state === 'learning' && activeConceptId && (
          <InteractiveSession
            key="learning"
            conceptId={activeConceptId}
            conceptLabel={getActiveConceptLabel()}
            onBack={() => setState('tree')}
            onComplete={handleCompleteConcept}
          />
        )}

        {state === 'solution' && problem && (
          <SolutionStepByStep
            key="solution"
            originalProblem={problem.originalProblem}
            similarProblem={problem.similarProblem || ''}
            steps={problem.similarSolution || []}
            prerequisites={problem.prerequisites}
            onBack={() => setState('tree')}
          />
        )}
      </AnimatePresence>

      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full bg-octopus-accent/5 blur-[120px]" />
        <div className="absolute -bottom-[40%] -right-[20%] w-[80%] h-[80%] rounded-full bg-blue-500/5 blur-[120px]" />
      </div>
    </div>
  );
}
