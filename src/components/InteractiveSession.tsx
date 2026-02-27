import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Sparkles, CheckCircle2, Trophy, Loader2 } from 'lucide-react';
import { ChatMessage } from '../types';
import { teachConcept, analyzeProblem } from '../services/gemini';
import { supabase } from '../lib/supabaseClient';
import Groq from 'groq-sdk';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Quiz } from './Quiz';

interface Props {
  conceptId: string;
  conceptLabel: string;
  onBack: () => void;
  onComplete: () => void;
}

export const InteractiveSession: React.FC<Props> = ({ conceptId, conceptLabel, onBack, onComplete }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: `Hello! Let's dive into **${conceptLabel}**. To start, what's your current understanding of this concept?` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await teachConcept(conceptLabel, [...messages, userMsg]);

      setMessages(prev => [...prev, { 
        role: 'model', 
        text: response.text,
      }]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const startQuiz = async () => {
    setIsLoading(true);
    try {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, dangerouslyAllowBrowser: true });
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a math teacher. Generate 3 multiple-choice questions to test understanding of a concept. Return JSON.",
          },
          {
            role: "user",
            content: `Generate a quiz for the concept: "${conceptLabel}". 
            Return JSON schema:
            {
              "questions": [
                {
                  "question": "string",
                  "options": ["string", "string", "string", "string"],
                  "correctIndex": number,
                  "explanation": "string"
                }
              ]
            }`,
          },
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
      });
      const content = completion.choices[0]?.message?.content;
      const data = JSON.parse(content || "{}");
      setQuizQuestions(data.questions);
      setIsQuizMode(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuizComplete = async (score: number) => {
    setQuizScore(score);
    if (!user) return;
    try {
      await supabase.from('student_activities').insert([
        {
          student_id: user.id,
          type: score >= 2 ? 'quiz_pass' : 'quiz_fail',
          concept_label: conceptLabel,
          score: score,
          duration_seconds: 0, // You might want to calculate this
        },
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  if (isQuizMode && quizQuestions.length > 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto w-full"
      >
        <div className="glass-panel p-8">
          {quizScore === null ? (
            <Quiz questions={quizQuestions} onComplete={handleQuizComplete} />
          ) : (
            <div className="text-center space-y-6 py-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-octopus-accent/10 mb-4">
                <Trophy className="w-10 h-10 text-octopus-accent" />
              </div>
              <h2 className="text-3xl font-serif italic">Quiz Complete!</h2>
              <p className="text-xl text-zinc-400">
                You scored <span className="text-octopus-accent font-bold">{quizScore}</span> out of {quizQuestions.length}
              </p>
              <div className="flex gap-4 justify-center pt-4">
                <button 
                  onClick={() => { setIsQuizMode(false); setQuizScore(null); }}
                  className="px-6 py-3 border border-white/10 rounded-xl hover:bg-white/5 transition-colors"
                >
                  Back to Chat
                </button>
                <button onClick={onComplete} className="octopus-button">
                  Finish Concept
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-4xl mx-auto w-full h-[80vh] flex flex-col"
    >
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          Back to Map
        </button>
        <div className="flex items-center gap-4">
          <span className="text-sm font-mono text-octopus-accent uppercase tracking-widest">Learning: {conceptLabel}</span>
          <button 
            onClick={startQuiz}
            disabled={isLoading}
            className="flex items-center gap-2 text-xs bg-octopus-accent/10 text-octopus-accent border border-octopus-accent/20 px-3 py-1 rounded-full hover:bg-octopus-accent hover:text-black transition-all"
          >
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
            Take Quiz
          </button>
        </div>
      </div>

      <div className="flex-1 glass-panel overflow-hidden flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] rounded-2xl p-4 ${
                msg.role === 'user' 
                  ? 'bg-octopus-accent text-black' 
                  : 'bg-zinc-800/50 border border-zinc-700 text-zinc-200'
              }`}>
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-4 flex gap-2">
                <div className="w-2 h-2 bg-octopus-accent rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-octopus-accent rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-octopus-accent rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-octopus-border bg-black/20">
          <div className="relative">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question or respond..."
              className="octopus-input pr-12"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-octopus-accent hover:scale-110 transition-transform disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};
