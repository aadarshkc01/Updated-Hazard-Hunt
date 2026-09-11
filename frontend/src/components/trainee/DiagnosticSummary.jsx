import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { soundEngine } from '../../utils/audio';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Clock,
  Target,
  Award,
  ShieldCheck,
  ShieldAlert,
  FileText,
  ArrowRight,
  Info,
} from 'lucide-react';

export const DiagnosticSummary = ({ diagnostic, onRetryPractice, onReturnHome }) => {
  if (!diagnostic) return null;

  const {
    recordId,
    userName,
    scenarioTitle,
    isPracticeMode,
    passed,
    passingThreshold = 75,
    totalScore = 0,
    hazardScore = 0,
    quizScore = 0,
    foundCount = 0,
    missedCount = 0,
    totalHazards = 5,
    hazardsFound = [],
    hazardsMissed = [],
    falseClicksCount = 0,
    timeTakenSeconds = 0,
    timeLimitSeconds = 90,
    quizReview = [],
    completedAt,
  } = diagnostic;

  useEffect(() => {
    if (passed) {
      soundEngine.playFanfare();
      try {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#7A35FF', '#10B981', '#F59E0B', '#F0F2F5'],
        });
      } catch (e) {}
    } else {
      soundEngine.playWarning();
    }
  }, [passed]);

  const formatSeconds = (sec) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-fade-in transition-colors duration-200">
      {/* 1. Pass/Fail Compliance Banner */}
      <div
        className={`rounded-3xl p-6 sm:p-8 text-white shadow-2xl border mb-8 relative overflow-hidden ${
          passed
            ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 border-emerald-500/50'
            : 'bg-gradient-to-r from-red-950 via-slate-900 to-amber-950 border-red-500/50'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center space-x-4">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 ${
                passed ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
              }`}
            >
              {passed ? <ShieldCheck className="w-10 h-10" /> : <ShieldAlert className="w-10 h-10" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span
                  className={`text-[11px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                    passed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                  }`}
                >
                  {isPracticeMode ? 'PRACTICE ASSESSMENT' : 'OFFICIAL COMPLIANCE AUDIT'}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(completedAt || Date.now()).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
                {passed ? 'COMPLIANCE CERTIFIED: PASS' : 'COMPLIANCE AUDIT: ACTION REQUIRED'}
              </h1>
              <p className="text-xs sm:text-sm text-gray-300 mt-1 font-medium">
                Trainee: <strong>{userName}</strong> • Scenario: <em>{scenarioTitle}</em>
              </p>
            </div>
          </div>

          {/* Overall Score Badge */}
          <div className="flex flex-col items-end bg-black/40 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10">
            <span className="text-[11px] uppercase tracking-wider text-gray-300 font-bold">
              Overall Composite Score
            </span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span
                className={`text-4xl sm:text-5xl font-black font-mono ${
                  passed ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {totalScore}%
              </span>
              <span className="text-xs text-gray-400 font-semibold">/ {passingThreshold}% Req</span>
            </div>
          </div>
        </div>

        {/* Practice Mode Notice */}
        {isPracticeMode && (
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center space-x-2 text-xs text-amber-300">
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>
              This session was completed in <strong>Practice Mode</strong>. It does not overwrite your official compliance audit history.
            </span>
          </div>
        )}
      </div>

      {/* 2. Key Diagnostic Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-dark-card rounded-3xl p-5 shadow-card dark:shadow-card-dark border border-mist-300 dark:border-dark-border transition-colors">
          <div className="flex items-center justify-between text-mist-600 dark:text-dark-muted mb-1">
            <span className="text-xs font-bold uppercase">Hazards Found</span>
            <Target className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-2xl font-black text-mist-900 dark:text-white font-mono">
            {foundCount} <span className="text-xs text-mist-500 dark:text-dark-muted font-normal">/ {totalHazards}</span>
          </div>
          <span className="text-[11px] text-mist-600 dark:text-dark-muted mt-1 block">
            {Math.round((foundCount / totalHazards) * 100)}% detection rate
          </span>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-3xl p-5 shadow-card dark:shadow-card-dark border border-mist-300 dark:border-dark-border transition-colors">
          <div className="flex items-center justify-between text-mist-600 dark:text-dark-muted mb-1">
            <span className="text-xs font-bold uppercase">False Clicks</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-mist-900 dark:text-white font-mono">
            {falseClicksCount}
          </div>
          <span className="text-[11px] text-red-500 mt-1 block font-medium">
            -{falseClicksCount * 5}% accuracy penalty
          </span>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-3xl p-5 shadow-card dark:shadow-card-dark border border-mist-300 dark:border-dark-border transition-colors">
          <div className="flex items-center justify-between text-mist-600 dark:text-dark-muted mb-1">
            <span className="text-xs font-bold uppercase">Time Taken</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-mist-900 dark:text-white font-mono">
            {formatSeconds(timeTakenSeconds)}
          </div>
          <span className="text-[11px] text-mist-600 dark:text-dark-muted mt-1 block">
            Time limit: {timeLimitSeconds}s
          </span>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-3xl p-5 shadow-card dark:shadow-card-dark border border-mist-300 dark:border-dark-border transition-colors">
          <div className="flex items-center justify-between text-mist-600 dark:text-dark-muted mb-1">
            <span className="text-xs font-bold uppercase">Quiz Score</span>
            <Award className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-2xl font-black text-mist-900 dark:text-white font-mono">
            {quizScore}%
          </div>
          <span className="text-[11px] text-mist-600 dark:text-dark-muted mt-1 block">
            HSE Regulations (4 Qs)
          </span>
        </div>
      </div>

      {/* 3. Detailed Itemized Hazards Review */}
      <div className="bg-white dark:bg-dark-card rounded-3xl shadow-card dark:shadow-card-dark border border-mist-300 dark:border-dark-border p-6 sm:p-7 mb-8 transition-colors">
        <h2 className="text-lg font-bold text-mist-900 dark:text-white mb-4 flex items-center space-x-2">
          <FileText className="w-5 h-5 text-violet-500" />
          <span>Warehouse Inspection Breakdown (Bay 4)</span>
        </h2>

        <div className="space-y-3">
          {hazardsFound.map((h) => (
            <div
              key={h.id}
              className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div className="flex items-start space-x-3">
                <div className="p-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs sm:text-sm text-mist-900 dark:text-white">
                      {h.title}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      SPOTTED
                    </span>
                  </div>
                  <p className="text-xs text-mist-600 dark:text-dark-muted mt-1">{h.explanation}</p>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-400 font-semibold mt-1">
                    Correct Action: {h.correctAction}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono font-bold text-mist-500 dark:text-dark-muted flex-shrink-0">
                {h.category}
              </span>
            </div>
          ))}

          {hazardsMissed.map((h) => (
            <div
              key={h.id}
              className="p-4 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div className="flex items-start space-x-3">
                <div className="p-1 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 mt-0.5">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs sm:text-sm text-mist-900 dark:text-white">
                      {h.title}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
                      MISSED HAZARD
                    </span>
                  </div>
                  <p className="text-xs text-mist-600 dark:text-dark-muted mt-1">{h.explanation}</p>
                  <p className="text-[11px] text-red-700 dark:text-red-400 font-semibold mt-1">
                    Remediation: {h.correctAction}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono font-bold text-red-600 dark:text-red-400 flex-shrink-0">
                {h.severity} Priority
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Quiz Review */}
      {quizReview.length > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-3xl shadow-card dark:shadow-card-dark border border-mist-300 dark:border-dark-border p-6 sm:p-7 mb-8 transition-colors">
          <h2 className="text-lg font-bold text-mist-900 dark:text-white mb-4 flex items-center space-x-2">
            <Award className="w-5 h-5 text-violet-500" />
            <span>Safety Regulatory Knowledge Review</span>
          </h2>

          <div className="space-y-3.5">
            {quizReview.map((q, idx) => (
              <div
                key={q.questionId || idx}
                className={`p-4 rounded-2xl border ${
                  q.isCorrect
                    ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20'
                    : 'border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-xs font-bold text-mist-900 dark:text-white">
                    Q{idx + 1}: {q.question}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                      q.isCorrect
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                    }`}
                  >
                    {q.isCorrect ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Correct</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Incorrect</span>
                      </>
                    )}
                  </span>
                </div>
                <p className="text-xs text-mist-600 dark:text-dark-muted mt-2 font-medium">
                  <strong>Standard:</strong> {q.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Action Buttons (FR-13: Practice Retry) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-mist-300 dark:border-dark-border">
        <div>
          <button
            onClick={onRetryPractice}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-mist-900 dark:bg-dark-surface hover:bg-mist-800 dark:hover:bg-dark-border text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry in Practice Mode</span>
          </button>
          <span className="text-[11px] text-mist-500 dark:text-dark-muted mt-1 block">
            Practice mode runs do not overwrite official compliance audits.
          </span>
        </div>

        <button
          onClick={onReturnHome}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-violet-500 hover:bg-violet-600 text-white text-xs font-bold transition-all shadow-violet hover:shadow-violet-lg flex items-center justify-center space-x-2"
        >
          <span>Return to Dashboard</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
