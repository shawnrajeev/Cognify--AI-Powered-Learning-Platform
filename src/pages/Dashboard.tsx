import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { DashboardStats, Note, Task } from '../types';
import Layout from '../components/Layout/Layout';
import {
  FileText,
  CheckSquare,
  Trophy,
  TrendingUp,
  Clock,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Calendar,
  Target,
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  async function fetchDashboardStats() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [notesRes, tasksRes, quizRes] = await Promise.all([
        supabase.from('notes').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(5),
        supabase.from('tasks').select('*').eq('user_id', user.id).order('deadline', { ascending: true, nullsFirst: false }),
        supabase.from('quiz_results').select('*').eq('user_id', user.id),
      ]);

      if (notesRes.error) throw notesRes.error;
      if (tasksRes.error) throw tasksRes.error;
      if (quizRes.error) throw quizRes.error;

      const notes = notesRes.data || [];
      const tasks = tasksRes.data || [];
      const quizResults = quizRes.data || [];

      const completedTasks = tasks.filter((t) => t.completed).length;
      const pendingTasks = tasks.length - completedTasks;
      const totalScore = quizResults.reduce((sum, r) => sum + r.score, 0);
      const averageScore = quizResults.length > 0 ? Math.round((totalScore / quizResults.length) * 20) : null;

      // Get upcoming tasks (not completed, deadline within 7 days or overdue)
      const now = new Date();
      const upcomingTasks = tasks
        .filter((t) => !t.completed)
        .filter((t) => {
          if (!t.deadline) return true;
          const deadline = new Date(t.deadline);
          const daysUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          return daysUntil <= 7 || deadline < now;
        })
        .slice(0, 5);

      setStats({
        totalNotes: notes.length,
        totalTasks: tasks.length,
        completedTasks,
        pendingTasks,
        averageScore,
        recentNotes: notes.slice(0, 3),
        upcomingTasks,
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-slate-400">Loading your dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-slate-400">Your learning activity at a glance</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.totalNotes}</p>
                <p className="text-xs text-slate-400">Total Notes</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.totalTasks}</p>
                <p className="text-xs text-slate-400">Total Tasks</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.completedTasks}</p>
                <p className="text-xs text-slate-400">Completed</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.pendingTasks}</p>
                <p className="text-xs text-slate-400">Pending</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {stats?.averageScore !== null ? `${stats?.averageScore}%` : '-'}
                </p>
                <p className="text-xs text-slate-400">Avg Quiz Score</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        {stats && stats.totalTasks > 0 && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Task Progress</h2>
              <span className="text-sm text-slate-400">
                {stats.completedTasks} of {stats.totalTasks} completed
              </span>
            </div>
            <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                style={{
                  width: `${stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Notes */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Recent Notes</h2>
              <Link
                to="/notes"
                className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                View all
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {stats?.recentNotes.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No notes yet</p>
                <Link
                  to="/notes"
                  className="text-emerald-400 hover:text-emerald-300 text-sm mt-2 inline-block"
                >
                  Create your first note
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {stats?.recentNotes.map((note) => (
                  <Link
                    key={note.id}
                    to="/notes"
                    className="block p-3 rounded-lg border border-slate-700 hover:border-slate-600 hover:bg-slate-700/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-medium text-white truncate">{note.title}</h3>
                        <p className="text-xs text-emerald-400 mt-1">{note.subject}</p>
                      </div>
                      <span className="text-xs text-slate-600 flex-shrink-0">
                        {new Date(note.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Tasks */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Upcoming Tasks</h2>
              <Link
                to="/tasks"
                className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                View all
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {stats?.upcomingTasks.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No upcoming tasks</p>
                <Link
                  to="/tasks"
                  className="text-emerald-400 hover:text-emerald-300 text-sm mt-2 inline-block"
                >
                  Create a task
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {stats?.upcomingTasks.map((task) => {
                  const isOverdue = task.deadline && new Date(task.deadline) < new Date();
                  return (
                    <Link
                      key={task.id}
                      to="/tasks"
                      className="block p-3 rounded-lg border hover:bg-slate-700/30 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-5 h-5 rounded-full flex-shrink-0 mt-0.5 ${
                            isOverdue ? 'bg-red-500/20' : 'bg-amber-500/20'
                          } flex items-center justify-center`}
                        >
                          {isOverdue ? (
                            <AlertTriangle className="w-3 h-3 text-red-400" />
                          ) : (
                            <Clock className="w-3 h-3 text-amber-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-white truncate">{task.title}</h3>
                          {task.deadline && (
                            <p
                              className={`text-xs mt-1 ${isOverdue ? 'text-red-400' : 'text-slate-500'}`}
                            >
                              Due: {new Date(task.deadline).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              to="/notes"
              className="flex items-center gap-4 p-4 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl hover:border-emerald-500/40 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-white">Create Note</p>
                <p className="text-xs text-slate-400">Start studying</p>
              </div>
            </Link>

            <Link
              to="/tasks"
              className="flex items-center gap-4 p-4 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border border-teal-500/20 rounded-xl hover:border-teal-500/40 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckSquare className="w-6 h-6 text-teal-400" />
              </div>
              <div>
                <p className="font-medium text-white">Add Task</p>
                <p className="text-xs text-slate-400">Stay organized</p>
              </div>
            </Link>

            <Link
              to="/quizzes"
              className="flex items-center gap-4 p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl hover:border-purple-500/40 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-white">Take Quiz</p>
                <p className="text-xs text-slate-400">Test knowledge</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
