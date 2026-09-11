import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  ShieldAlert, Clock, Target, Award, CheckCircle2, XCircle, AlertTriangle,
  Play, RotateCcw, ChevronRight, BarChart3, Zap, TrendingUp, Info,
  BookOpen, Star, Timer, Activity, Eye, Lock
} from 'lucide-react';

// ── Mini score ring ────────────────────────────────────────────────────────
const ScoreRing = ({ score, size = 90, strokeWidth = 8 }) => {
  const r = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = ((100 - score) / 100) * circumference;
  const color = score >= 75 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor"
        strokeWidth={strokeWidth} className="text-mist-200 dark:text-dark-surface" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
        strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
    </svg>
  );
};

export const EmployeeHome = ({ onLaunchSession, scenario, loading }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const records = await api.getMyHistory();
        setHistory(records || []);
      } catch (err) {
        // Silently fail
      } finally {
        setHistoryLoading(false);
      }
    };
    loadHistory();
  }, []);

  const officialAttempts = history.filter(r => !r.isPracticeMode);
  const practiceAttempts = history.filter(r => r.isPracticeMode);
  const latestOfficial = officialAttempts[0] || null;
  const bestScore = officialAttempts.length > 0
    ? Math.max(...officialAttempts.map(r => r.totalScore))
    : null;
  const passedCount = officialAttempts.filter(r => r.passed).length;
  const latestScore = latestOfficial?.totalScore ?? null;

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">

      {/* Personalized greeting hero */}
      <div className="bg-gradient-to-r from-violet-600 via-violet-500 to-purple-600 rounded-3xl p-6 text-white shadow-violet-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-48 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)', transform: 'translate(20%, -20%)' }} />
        <div className="relative">
          <p className="text-violet-200 text-sm mb-1">{greeting}, {user?.name?.split(' ')[0]}!</p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
            Hazard Hunt <span className="text-violet-200">360°</span>
          </h1>
          <p className="text-violet-100 text-sm max-w-xl">
            Complete your warehouse safety inspection. Navigate the 360° environment, identify hazardous conditions, and pass the compliance quiz.
          </p>
          {latestOfficial && (
            <div className="mt-3 inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2">
              {latestOfficial.passed
                ? <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                : <AlertTriangle className="w-4 h-4 text-amber-300" />}
              <span className="text-sm font-bold">
                Last attempt: {latestScore}% — {latestOfficial.passed ? 'CERTIFIED ✓' : 'NOT YET CERTIFIED'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            icon: BarChart3,
            label: 'Official Attempts',
            value: officialAttempts.length,
            sub: `${practiceAttempts.length} practice`,
            color: 'text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-950/40',
          },
          {
            icon: Award,
            label: 'Best Score',
            value: bestScore !== null ? `${bestScore}%` : '—',
            sub: bestScore !== null ? (bestScore >= 75 ? 'Certified ✓' : 'Below threshold') : 'No attempts yet',
            color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40',
          },
          {
            icon: CheckCircle2,
            label: 'Sessions Passed',
            value: passedCount,
            sub: `${officialAttempts.length - passedCount} failed`,
            color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/40',
          },
          {
            icon: Timer,
            label: 'Time Limit',
            value: `${scenario?.timeLimitSeconds || 90}s`,
            sub: 'Per inspection session',
            color: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/40',
          },
        ].map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-card dark:shadow-card-dark border border-mist-300 dark:border-dark-border">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-xl font-black text-mist-900 dark:text-white leading-none">{value}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-mist-500 dark:text-dark-muted mt-1">{label}</p>
            <p className="text-[10px] text-mist-400 dark:text-dark-muted mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Main launch card */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Scenario info + launch */}
        <div className="md:col-span-2 bg-white dark:bg-dark-card rounded-2xl shadow-card dark:shadow-card-dark border border-mist-300 dark:border-dark-border overflow-hidden">
          <div className="p-5 border-b border-mist-100 dark:border-dark-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-violet-500">Active Training Scenario</p>
                  <h3 className="text-sm font-bold text-mist-900 dark:text-white">
                    {loading ? 'Loading scenario…' : (scenario?.title || 'Bay 4: Automotive Logistics')}
                  </h3>
                </div>
              </div>
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
              </span>
            </div>
            <p className="text-xs text-mist-600 dark:text-dark-muted leading-relaxed">{scenario?.description}</p>
          </div>

          <div className="grid grid-cols-4 divide-x divide-mist-100 dark:divide-dark-border">
            {[
              { label: 'Hazards', value: `${scenario?.hotspots?.filter(h => h.isHazard).length || 5}`, icon: Target },
              { label: 'Time', value: `${scenario?.timeLimitSeconds || 90}s`, icon: Clock },
              { label: 'Pass At', value: `${scenario?.passingScorePercentage || 75}%`, icon: Award },
              { label: 'Quiz Q\'s', value: `${scenario?.quizQuestions?.length || 4}`, icon: BookOpen },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="p-3.5 text-center">
                <Icon className="w-4 h-4 text-mist-400 dark:text-dark-muted mx-auto mb-1" />
                <p className="text-sm font-black text-mist-900 dark:text-white">{value}</p>
                <p className="text-[10px] text-mist-500 dark:text-dark-muted">{label}</p>
              </div>
            ))}
          </div>

          <div className="p-5 bg-mist-50/50 dark:bg-dark-surface/20 space-y-2.5">
            <button
              onClick={() => onLaunchSession(false)}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-violet-500 hover:bg-violet-600 text-white font-bold text-sm shadow-violet transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 hover:-translate-y-0.5"
            >
              <Play className="w-5 h-5 fill-current" />
              Begin Official Compliance Session
            </button>
            <button
              onClick={() => onLaunchSession(true)}
              disabled={loading}
              className="w-full py-2.5 rounded-2xl bg-mist-100 dark:bg-dark-surface hover:bg-amber-50 dark:hover:bg-amber-950/30 text-mist-700 dark:text-white font-semibold text-xs border border-mist-300 dark:border-dark-border hover:border-amber-400/60 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4 text-amber-500" />
              Start Practice Mode (Results Not Recorded)
            </button>
          </div>
        </div>

        {/* How it works / scoring guide */}
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-card dark:shadow-card-dark border border-mist-300 dark:border-dark-border p-5">
          <h3 className="text-sm font-bold text-mist-900 dark:text-white mb-4 flex items-center gap-2">
            <Info className="w-4 h-4 text-violet-500" /> Scoring Guide
          </h3>
          <div className="space-y-3">
            {[
              { icon: Target, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30', label: 'Spot hazard', value: '+20% each', desc: 'Hazard perception score' },
              { icon: AlertTriangle, color: 'text-red-500 bg-red-50 dark:bg-red-950/30', label: 'False click', value: '–5%', desc: 'Accuracy penalty' },
              { icon: BookOpen, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30', label: 'Quiz score', value: '40%', desc: 'of total composite' },
              { icon: Award, color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/30', label: 'Pass threshold', value: '75%', desc: 'Required to certify' },
            ].map(({ icon: Icon, color, label, value, desc }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-mist-800 dark:text-white">{label}</span>
                    <span className="text-xs font-black text-mist-900 dark:text-white">{value}</span>
                  </div>
                  <p className="text-[10px] text-mist-500 dark:text-dark-muted">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-mist-100 dark:border-dark-border">
            <p className="text-[11px] text-mist-500 dark:text-dark-muted flex items-start gap-1.5">
              <Lock className="w-3 h-3 flex-shrink-0 mt-0.5 text-violet-400" />
              Official session results are permanently saved to the enterprise compliance database and visible to your HSE supervisor.
            </p>
          </div>
        </div>
      </div>

      {/* Compliance history */}
      {history.length > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-card dark:shadow-card-dark border border-mist-300 dark:border-dark-border overflow-hidden">
          <div className="px-5 py-3.5 border-b border-mist-100 dark:border-dark-border flex items-center gap-2 bg-mist-50/50 dark:bg-dark-surface/30">
            <Activity className="w-4 h-4 text-violet-500" />
            <h3 className="text-sm font-bold text-mist-900 dark:text-white">Your Compliance History</h3>
          </div>
          <div className="divide-y divide-mist-100 dark:divide-dark-border">
            {history.slice(0, 6).map((rec, i) => (
              <div key={rec._id || i} className="flex items-center justify-between px-5 py-3.5 hover:bg-mist-50/30 dark:hover:bg-dark-surface/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 ${
                    rec.isPracticeMode
                      ? 'bg-mist-100 dark:bg-dark-surface text-mist-500 dark:text-dark-muted'
                      : rec.passed
                        ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                        : 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400'
                  }`}>
                    {rec.isPracticeMode ? '✱' : rec.passed ? '✓' : '✗'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-mist-900 dark:text-white">
                        {new Date(rec.completedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      {rec.isPracticeMode && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-mist-200 dark:bg-dark-border text-mist-600 dark:text-dark-muted">PRACTICE</span>
                      )}
                    </div>
                    <p className="text-[10px] text-mist-500 dark:text-dark-muted">
                      {rec.hazardsFound?.length ?? 0}/{(rec.hazardsFound?.length ?? 0) + (rec.hazardsMissed?.length ?? 0)} hazards · {rec.falseClicksCount} false clicks · {rec.timeTakenSeconds}s
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-base font-black ${
                    rec.isPracticeMode ? 'text-mist-600 dark:text-dark-muted' :
                    rec.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}>{rec.totalScore}%</p>
                  <p className="text-[10px] text-mist-400 dark:text-dark-muted">{rec.hazardScore}% + {rec.quizScore}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
