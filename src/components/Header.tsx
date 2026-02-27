import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, User, GraduationCap, School, Sun, Moon } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (!isAuthenticated || !user) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-xl border-b border-white/5 dark:bg-black/50 light-theme:bg-white/50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-serif italic text-octopus-accent">Octopus</h1>
          
          {user.role === 'student' && user.teacherName && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-octopus-accent/10 border border-octopus-accent/20 rounded-full">
              <GraduationCap className="w-4 h-4 text-octopus-accent" />
              <span className="text-xs font-mono text-octopus-accent uppercase tracking-widest">
                Classroom: {user.teacherName}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={toggleTheme}
            className="p-2 text-zinc-500 hover:text-octopus-accent transition-colors rounded-full hover:bg-white/5"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-3 border-l border-white/10 pl-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-white">{user.name}</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                {user.role}
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400">
              {user.role === 'teacher' ? <School className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
          </div>

          <button 
            onClick={logout}
            className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
