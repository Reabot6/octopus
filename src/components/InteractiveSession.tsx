import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Sparkles } from 'lucide-react';
import { ChatMessage } from '../types';
import { teachConcept, generateIllustration } from '../services/gemini';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

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
  const scrollRef = useRef<HTMLDivElement>(null);

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
      let imageUrl: string | undefined;
      
      if (response.illustrationPrompt) {
        imageUrl = await generateIllustration(response.illustrationPrompt);
      }

      setMessages(prev => [...prev, { 
        role: 'model', 
        text: response.text,
        image: imageUrl
      }]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

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
          <button onClick={onComplete} className="text-xs bg-octopus-accent/10 text-octopus-accent border border-octopus-accent/20 px-3 py-1 rounded-full hover:bg-octopus-accent hover:text-black transition-all">
            Mark as Understood
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
                {msg.image && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-4 rounded-xl overflow-hidden border border-white/10"
                  >
                    <img src={msg.image} alt="Illustration" className="w-full h-auto" referrerPolicy="no-referrer" />
                  </motion.div>
                )}
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
