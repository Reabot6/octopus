import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, ArrowRight, Loader2, Trophy } from 'lucide-react';

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface Props {
  questions: Question[];
  onComplete: (score: number) => void;
}

export const Quiz: React.FC<Props> = ({ questions, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);

  const currentQuestion = questions[currentIndex];

  const handleOptionSelect = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
    setIsAnswered(true);
    if (index === currentQuestion.correctIndex) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      onComplete(score);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
          Question {currentIndex + 1} of {questions.length}
        </span>
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <div 
              key={i} 
              className={`h-1 w-8 rounded-full transition-colors ${i <= currentIndex ? 'bg-octopus-accent' : 'bg-white/10'}`} 
            />
          ))}
        </div>
      </div>

      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6"
      >
        <h3 className="text-xl font-medium leading-relaxed">{currentQuestion.question}</h3>

        <div className="grid gap-3">
          {currentQuestion.options.map((option, i) => {
            const isCorrect = i === currentQuestion.correctIndex;
            const isSelected = i === selectedOption;
            
            let variant = 'default';
            if (isAnswered) {
              if (isCorrect) variant = 'correct';
              else if (isSelected) variant = 'wrong';
            }

            return (
              <button
                key={i}
                onClick={() => handleOptionSelect(i)}
                disabled={isAnswered}
                className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between ${
                  variant === 'correct' ? 'bg-green-500/10 border-green-500 text-green-400' :
                  variant === 'wrong' ? 'bg-red-500/10 border-red-500 text-red-400' :
                  isSelected ? 'bg-octopus-accent/10 border-octopus-accent text-octopus-accent' :
                  'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                }`}
              >
                <span>{option}</span>
                {isAnswered && isCorrect && <CheckCircle2 className="w-5 h-5" />}
                {isAnswered && isSelected && !isCorrect && <XCircle className="w-5 h-5" />}
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {isAnswered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-white/5 rounded-xl border border-white/10 text-sm text-zinc-400 italic"
            >
              <p>{currentQuestion.explanation}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {isAnswered && (
          <button
            onClick={handleNext}
            className="octopus-button w-full flex items-center justify-center gap-2"
          >
            {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
            <ArrowRight className="w-5 h-5" />
          </button>
        )}
      </motion.div>
    </div>
  );
};
