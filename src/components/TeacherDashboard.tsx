import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Clock, Brain, ChevronRight, ArrowLeft, Search, Calendar, Sparkles, BarChart3, AlertTriangle, MessageSquare, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Chat } from './Chat';

interface Student {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

interface Activity {
  id: number;
  type: string;
  problem_text?: string;
  concept_label?: string;
  duration_seconds: number;
  score?: number;
  created_at: string;
}

interface HeatmapItem {
  concept_label: string;
  total_attempts: number;
  failures: number;
}

export const TeacherDashboard: React.FC = () => {
  const { token, user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapItem[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [pow, setPow] = useState<string>('');
  const [isSavingPow, setIsSavingPow] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'activity' | 'chat'>('activity');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [studentsRes, heatmapRes, summaryRes, powRes] = await Promise.all([
        fetch('/api/teacher/students', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/teacher/heatmap', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/teacher/summary', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/student/problem-of-the-week', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setStudents(await studentsRes.json());
      setHeatmap(await heatmapRes.json());
      const summaryData = await summaryRes.json();
      setSummary(summaryData.summary);
      const powData = await powRes.json();
      setPow(powData.problem || '');
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePow = async () => {
    setIsSavingPow(true);
    try {
      await fetch('/api/teacher/problem-of-the-week', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ problemText: pow })
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingPow(false);
    }
  };

  const fetchStudentDetail = async (student: Student) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/teacher/student/${student.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSelectedStudent(student);
      setActivities(data.activities);
      setActiveTab('activity');
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && students.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-octopus-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto w-full">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif italic mb-1">Classroom Dashboard</h2>
          <div className="flex items-center gap-2 text-zinc-400 text-sm">
            <Users className="w-4 h-4" />
            <span>{students.length} Students linked</span>
            <span className="mx-2">•</span>
            <span className="font-mono text-octopus-accent">Code: {user?.teacherCode}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2 space-y-8">
          {/* Problem of the Week */}
          <div className="glass-panel p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-octopus-accent" />
                <h3 className="text-xl font-serif italic">Problem of the Week</h3>
              </div>
              <button
                onClick={handleSavePow}
                disabled={isSavingPow}
                className="text-xs font-mono uppercase tracking-widest bg-octopus-accent text-white px-4 py-2 rounded-lg hover:bg-octopus-accent/80 transition-colors disabled:opacity-50"
              >
                {isSavingPow ? 'Saving...' : 'Update Problem'}
              </button>
            </div>
            <textarea
              value={pow}
              onChange={(e) => setPow(e.target.value)}
              placeholder="Enter a challenging problem for your students to solve this week..."
              className="octopus-input w-full h-32 resize-none"
            />
            <p className="text-[10px] text-zinc-500 mt-2">This problem will appear as a notification for all your students when they log in.</p>
          </div>

          {/* AI Summary */}
          <div className="glass-panel p-8 bg-octopus-accent/5 border-octopus-accent/20">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="w-6 h-6 text-octopus-accent" />
              <h3 className="text-xl font-serif italic">Octopus Insights</h3>
            </div>
            <div className="prose prose-invert prose-sm max-w-none text-zinc-300 leading-relaxed">
              {summary ? <ReactMarkdown>{summary}</ReactMarkdown> : <p>Generating insights...</p>}
            </div>
          </div>

          {/* Heatmap */}
          <div className="glass-panel p-8">
            <div className="flex items-center gap-3 mb-8">
              <BarChart3 className="w-6 h-6 text-octopus-accent" />
              <h3 className="text-xl font-serif italic">Concept Struggle Heatmap</h3>
            </div>
            <div className="space-y-4">
              {heatmap.length > 0 ? heatmap.map((item, i) => {
                const failureRate = (item.failures / item.total_attempts) * 100;
                return (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-white">{item.concept_label}</span>
                      <span className="text-zinc-500">{item.failures} struggles / {item.total_attempts} attempts</span>
                    </div>
                    <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${failureRate}%` }}
                        className={`h-full transition-all ${failureRate > 50 ? 'bg-red-500' : failureRate > 25 ? 'bg-yellow-500' : 'bg-octopus-accent'}`}
                      />
                    </div>
                  </div>
                );
              }) : <p className="text-zinc-500 text-center py-8">No concept data yet.</p>}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {!selectedStudent ? (
              <motion.div
                key="list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="glass-panel overflow-hidden"
              >
                <div className="p-4 border-b border-white/10 text-[10px] uppercase tracking-widest font-mono text-zinc-500">
                  Student List
                </div>
                {students.length === 0 ? (
                  <div className="p-12 text-center text-zinc-500 italic">
                    No students yet.
                  </div>
                ) : (
                  students.map((s) => (
                    <div 
                      key={s.id}
                      onClick={() => fetchStudentDetail(s)}
                      className="p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-octopus-accent/10 flex items-center justify-center text-octopus-accent font-serif italic">
                          {s.name[0]}
                        </div>
                        <div>
                          <div className="text-white font-medium">{s.name}</div>
                          <div className="text-[10px] text-zinc-500">{s.email}</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-octopus-accent transition-colors" />
                    </div>
                  ))
                )}
              </motion.div>
            ) : (
              <motion.div
                key="detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <button 
                  onClick={() => setSelectedStudent(null)}
                  className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-4"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back to List
                </button>

                <div className="glass-panel overflow-hidden">
                  <div className="p-6 bg-white/5 border-b border-white/10">
                    <div className="w-16 h-16 rounded-full bg-octopus-accent/10 flex items-center justify-center text-octopus-accent text-2xl font-serif italic mb-4 mx-auto">
                      {selectedStudent.name[0]}
                    </div>
                    <h3 className="text-xl font-medium text-center mb-1">{selectedStudent.name}</h3>
                    <p className="text-zinc-500 text-sm text-center">{selectedStudent.email}</p>
                  </div>

                  <div className="flex border-b border-white/10">
                    <button
                      onClick={() => setActiveTab('activity')}
                      className={`flex-1 py-3 text-xs font-mono uppercase tracking-widest transition-colors ${activeTab === 'activity' ? 'text-octopus-accent bg-octopus-accent/5' : 'text-zinc-500 hover:text-white'}`}
                    >
                      Activity
                    </button>
                    <button
                      onClick={() => setActiveTab('chat')}
                      className={`flex-1 py-3 text-xs font-mono uppercase tracking-widest transition-colors ${activeTab === 'chat' ? 'text-octopus-accent bg-octopus-accent/5' : 'text-zinc-500 hover:text-white'}`}
                    >
                      Message
                    </button>
                  </div>

                  <div className="h-[400px]">
                    {activeTab === 'activity' ? (
                      <div className="p-6 space-y-4 overflow-y-auto h-full">
                        <h4 className="text-[10px] uppercase tracking-widest font-mono text-zinc-500 mb-4">Recent Activity</h4>
                        {activities.length > 0 ? activities.map((a) => (
                          <div key={a.id} className="text-xs border-l border-octopus-accent/30 pl-3 py-2">
                            <div className="flex justify-between items-start mb-1">
                              <div className="text-white font-medium capitalize">{a.type}</div>
                              <div className="text-[10px] text-zinc-600">{new Date(a.created_at).toLocaleDateString()}</div>
                            </div>
                            <div className="text-zinc-500 truncate">{a.concept_label || a.problem_text}</div>
                          </div>
                        )) : <p className="text-zinc-500 text-center py-8 italic">No activity yet.</p>}
                      </div>
                    ) : (
                      <Chat otherUserId={selectedStudent.id} otherUserName={selectedStudent.name} />
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
