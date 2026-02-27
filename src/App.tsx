import { useState, useEffect } from 'react';
import { MathInput } from './components/MathInput';
import { PrerequisiteTree } from './components/PrerequisiteTree';
import { InteractiveSession } from './components/InteractiveSession';
import { SolutionStepByStep } from './components/SolutionStepByStep';
import { Auth } from './components/Auth';
import { Header } from './components/Header';
import { TeacherDashboard } from './components/TeacherDashboard';
import { Badges } from './components/Badges';
import { Chat } from './components/Chat';
import { Sparkles, MessageSquare, Bell, X, Copy, Check } from 'lucide-react';
import { AppState, MathProblem, Prerequisite } from './types';
import { analyzeProblem } from './services/gemini';
import { useAuth } from './context/AuthContext';
import { supabase } from './lib/supabaseClient';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const { isAuthenticated, user } = useAuth();
  const [state, setState] = useState<AppState>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [problem, setProblem] = useState<MathProblem | null>(null);
  const [activeConceptId, setActiveConceptId] = useState<string | null>(null);
  const [pow, setPow] = useState<string | null>(null);
  const [showPow, setShowPow] = useState(false);
  const [copiedPow, setCopiedPow] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'student') {
      fetchPow();
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  const fetchPow = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('problem_of_the_week')
        .select('problem_text')
        .eq('teacher_id', user.user_metadata.teacher_id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      if (data?.problem_text) {
        setPow(data.problem_text);
        setShowPow(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUnreadCount = async () => {
    if (!user) return;
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (err) {
      console.error(err);
    }
  };

  const copyPow = () => {
    if (pow) {
      navigator.clipboard.writeText(pow);
      setCopiedPow(true);
      setTimeout(() => setCopiedPow(false), 2000);
    }
  };

  const handleAnalyze = async (input: string, image?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyzeProblem(input, image);
      const prerequisites = Array.isArray(result.prerequisites) ? result.prerequisites : [];
      
      if (prerequisites.length === 0) {
        throw new Error("The AI couldn't identify any prerequisites for this problem. Try rephrasing it or using a different problem.");
      }

      const similarSolution = Array.isArray(result.similarSolution) ? result.similarSolution : [];
      if (similarSolution.length === 0) {
        throw new Error("The AI failed to generate a step-by-step solution. Please try again.");
      }

      setProblem({
        originalProblem: input,
        prerequisites: prerequisites.map(p => ({ ...p, completed: false })),
        similarProblem: result.similarProblem,
        similarSolution: similarSolution
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
      if (!Array.isArray(nodes)) return [];
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

  const handleCompleteConcept = async () => {
    if (activeConceptId && user) {
      const label = getActiveConceptLabel();
      handleTogglePrerequisite(activeConceptId);
      
      try {
        await supabase.from('student_activities').insert([
          {
            student_id: user.id,
            type: 'concept_completion',
            concept_label: label,
            duration_seconds: 0, // You might want to calculate this
          },
        ]);
      } catch (e) {
        console.error("Failed to log completion", e);
      }
    }
    setState('tree');
    setActiveConceptId(null);
  };

  const getActiveConceptLabel = () => {
    if (!problem || !activeConceptId) return '';
    const findLabel = (nodes: Prerequisite[]): string | undefined => {
      if (!Array.isArray(nodes)) return undefined;
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
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <Header />
      
      {/* Problem of the Week Notification */}
      <AnimatePresence>
        {showPow && pow && user?.role === 'student' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[55] w-full max-w-xl px-4"
          >
            <div className="glass-panel p-4 bg-octopus-accent/10 border-octopus-accent/30 flex items-start gap-4 shadow-2xl">
              <div className="w-10 h-10 rounded-full bg-octopus-accent/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-octopus-accent" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-serif italic text-white">Problem of the Week</h4>
                  <button onClick={() => setShowPow(false)} className="text-zinc-500 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-zinc-300 mb-3 line-clamp-2">{pow}</p>
                <div className="flex gap-2">
                  <button
                    onClick={copyPow}
                    className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest bg-octopus-accent text-white px-3 py-1.5 rounded-lg hover:bg-octopus-accent/80 transition-all"
                  >
                    {copiedPow ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedPow ? 'Copied!' : 'Copy Problem'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Student Chat Toggle */}
      {isAuthenticated && user?.role === 'student' && (
        <div className="fixed bottom-6 right-6 z-[100]">
          <AnimatePresence>
            {showChat && user.teacherId && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="glass-panel w-[350px] h-[500px] mb-4 shadow-2xl flex flex-col overflow-hidden"
              >
                <div className="p-4 bg-octopus-accent/10 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-octopus-accent/20 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-octopus-accent" />
                    </div>
                    <span className="text-sm font-serif italic">Chat with Teacher</span>
                  </div>
                  <button onClick={() => setShowChat(false)} className="text-zinc-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <Chat otherUserId={user.teacherId} otherUserName="Teacher" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setShowChat(!showChat)}
            className="w-14 h-14 rounded-full bg-octopus-accent text-white shadow-xl flex items-center justify-center hover:scale-110 transition-transform relative"
          >
            <MessageSquare className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center border-2 border-octopus-bg">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          <Auth key="auth" />
        ) : user?.role === 'teacher' ? (
          <TeacherDashboard key="teacher" />
        ) : (
          <>
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
              <div className="space-y-12">
                <MathInput key="input" onAnalyze={handleAnalyze} isLoading={isLoading} />
                <div className="max-w-4xl mx-auto">
                  <Badges />
                </div>
              </div>
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
          </>
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
