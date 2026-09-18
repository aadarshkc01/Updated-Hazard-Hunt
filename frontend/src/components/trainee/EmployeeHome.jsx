import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  ShieldAlert, Clock, Target, Award, CheckCircle2, XCircle, AlertTriangle,
  Play, RotateCcw, Info, Lock, Activity, Download
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

  const officialAttempts = history
    .filter(r => !r.isPracticeMode)
    .sort((left, right) => new Date(right.completedAt || 0) - new Date(left.completedAt || 0));
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
      <div className="bg-primary-600 rounded-xl p-6 text-white relative overflow-hidden">
        <div className="relative">
          <p className="text-primary-100 text-sm mb-1">{greeting}, {user?.name?.split(' ')[0]}!</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
            Hazard Hunt 360°
          </h1>
          <p className="text-primary-100 text-sm max-w-xl">
            Complete your warehouse safety inspection. Navigate the 360° environment, identify hazardous conditions, and pass the compliance quiz.
          </p>
          {latestOfficial && (
            <div className="mt-3 inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2">
              {latestOfficial.passed
                ? <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                : <AlertTriangle className="w-4 h-4 text-amber-300" />}
              <span className="text-sm font-bold">
                Last attempt: {latestScore}% — {latestOfficial.passed ? 'CERTIFIED' : 'NOT YET CERTIFIED'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Official Attempts',
            value: officialAttempts.length,
            sub: `${practiceAttempts.length} practice`,
          },
          {
            label: 'Best Score',
            value: bestScore !== null ? `${bestScore}%` : '—',
            sub: bestScore !== null ? (bestScore >= 75 ? 'Certified' : 'Below threshold') : 'No attempts yet',
          },
          {
            label: 'Sessions Passed',
            value: passedCount,
            sub: `${officialAttempts.length - passedCount} failed`,
          },
          {
            label: 'Time Limit',
            value: `${scenario?.timeLimitSeconds || 90}s`,
            sub: 'Per inspection session',
          },
        ].map(({ label, value, sub }) => (
          <div key={label} className="app-card p-4">
            <p className="text-xl font-bold text-mist-900 dark:text-white leading-none">{value}</p>
            <p className="text-xs font-semibold text-mist-600 dark:text-dark-muted mt-1">{label}</p>
            <p className="text-[10px] text-mist-500 dark:text-dark-muted mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Main launch card */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Scenario info + launch */}
        <div className="md:col-span-2 app-card overflow-hidden">
          <div className="p-5 border-b border-mist-100 dark:border-dark-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-primary-500">Active Training Scenario</p>
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
              { label: 'Hazards', value: `${scenario?.hotspots?.filter(h => h.isHazard).length || 5}` },
              { label: 'Time', value: `${scenario?.timeLimitSeconds || 90}s` },
              { label: 'Pass At', value: `${scenario?.passingScorePercentage || 75}%` },
              { label: 'Quiz Q\'s', value: `${scenario?.quizQuestions?.length || 4}` },
            ].map(({ label, value }) => (
              <div key={label} className="p-3.5 text-center">
                <p className="text-sm font-bold text-mist-900 dark:text-white">{value}</p>
                <p className="text-xs text-mist-600 dark:text-dark-muted">{label}</p>
              </div>
            ))}
          </div>

          <div className="p-5 bg-mist-50/50 dark:bg-dark-surface/20 space-y-2.5">
            <button
              onClick={() => onLaunchSession(false)}
              disabled={loading}
              className="w-full py-3 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
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
        <div className="app-card p-5">
          <h3 className="text-sm font-bold text-mist-900 dark:text-white mb-4">
            Scoring Guide
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Spot hazard', value: '+20% each', desc: 'Hazard perception score' },
              { label: 'False click', value: '–5%', desc: 'Accuracy penalty' },
              { label: 'Quiz score', value: '40%', desc: 'of total composite' },
              { label: 'Pass threshold', value: '75%', desc: 'Required to certify' },
            ].map(({ label, value, desc }) => (
              <div key={label} className="flex justify-between items-center py-1">
                <div>
                  <div className="text-xs font-semibold text-mist-800 dark:text-white">{label}</div>
                  <div className="text-[10px] text-mist-500 dark:text-dark-muted">{desc}</div>
                </div>
                <div className="text-xs font-bold text-mist-900 dark:text-white">{value}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-mist-100 dark:border-dark-border">
            <p className="text-[11px] text-mist-500 dark:text-dark-muted flex items-start gap-1.5">
              <Lock className="w-3 h-3 flex-shrink-0 mt-0.5 text-mist-500" />
              Official session results are permanently saved to the enterprise compliance database and visible to your HSE supervisor.
            </p>
          </div>
        </div>
      </div>

      {/* Compliance history */}
      {history.length > 0 && (
        <div className="app-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-mist-100 dark:border-dark-border flex items-center justify-between bg-mist-50/50 dark:bg-dark-surface/30">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-mist-900 dark:text-white">Your Compliance History</h3>
            </div>
            <button
              onClick={async () => {
                try {
                  api.downloadScoreReport(officialAttempts, user);
                  showToast('Score report downloaded', 'success');
                } catch (err) {
                  showToast('Failed to download report: ' + err.message, 'error');
                }
              }}
              disabled={officialAttempts.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:hover:bg-primary-900/50 dark:text-primary-300 text-xs font-bold rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download Score Report
            </button>
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
                    {rec.isPracticeMode ? <Activity className="w-4 h-4" /> : rec.passed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
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
