import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { LogIn, UserPlus, GraduationCap, User, School, ArrowRight, Loader2 } from 'lucide-react';

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'individual' | 'student' | 'teacher'>('individual');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { login, signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password, name, role, teacherCode);
        setMessage('Please check your email to confirm your account.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-8"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-serif italic mb-2">
            {isLogin ? 'Welcome Back' : 'Join Octopus'}
          </h2>
          <p className="text-zinc-400 text-sm">
            {isLogin ? 'Continue your mathematical journey' : 'Start mastering math with AI'}
          </p>
        </div>

        {!isLogin && (
          <div className="flex gap-2 mb-6">
            {(['individual', 'student', 'teacher'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                  role === r 
                    ? 'bg-octopus-accent/10 border-octopus-accent text-octopus-accent' 
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
                }`}
              >
                {r === 'individual' && <User className="w-5 h-5" />}
                {r === 'student' && <GraduationCap className="w-5 h-5" />}
                {r === 'teacher' && <School className="w-5 h-5" />}
                <span className="text-[10px] uppercase tracking-widest font-mono">{r}</span>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="octopus-input"
              required
            />
          )}
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="octopus-input"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="octopus-input"
            required
          />
          
          {!isLogin && role === 'student' && (
            <input
              type="text"
              placeholder="Teacher Code (e.g. OCTO-XXXXX)"
              value={teacherCode}
              onChange={(e) => setTeacherCode(e.target.value)}
              className="octopus-input border-octopus-accent/30"
              required
            />
          )}

          {error && (
            <p className="text-red-400 text-xs text-center bg-red-400/10 p-2 rounded-lg border border-red-400/20">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="octopus-button w-full flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {isLogin ? 'Sign In' : 'Create Account'}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
          {message && <p className="text-green-400 text-sm text-center mt-4">{message}</p>}
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-zinc-400 hover:text-octopus-accent transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
