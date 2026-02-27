import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { Trophy, Shield, Zap, Triangle, Star } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface Badge {
  id: number;
  name: string;
  description: string;
  icon: string;
  earned_at: string;
}

const IconMap: Record<string, any> = {
  Trophy,
  Shield,
  Zap,
  Triangle,
  Star
};

export const Badges: React.FC = () => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    const fetchBadges = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('user_badges')
          .select('badges(*)')
          .eq('user_id', user.id);

        if (error) throw error;
        
        const earnedBadges = data.map((item: any) => ({ ...item.badges, earned_at: item.created_at }));
        setBadges(earnedBadges);
      } catch (err) {
        console.error(err);
      }
    };
    fetchBadges();
  }, [user]);

  if (badges.length === 0) return null;

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="w-5 h-5 text-octopus-accent" />
        <h3 className="text-sm font-mono uppercase tracking-widest text-white">Mastery Badges</h3>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {badges.map((badge) => {
          const Icon = IconMap[badge.icon] || Star;
          return (
            <motion.div
              key={badge.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center text-center p-4 rounded-xl bg-white/5 border border-white/10 hover:border-octopus-accent/50 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-octopus-accent/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Icon className="w-6 h-6 text-octopus-accent" />
              </div>
              <div className="text-xs font-bold text-white mb-1">{badge.name}</div>
              <div className="text-[10px] text-zinc-500 leading-tight">{badge.description}</div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
