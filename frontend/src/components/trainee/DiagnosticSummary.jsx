import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { soundEngine } from '../../utils/audio';
import { api } from '../../services/api';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

export const DiagnosticSummary = ({ diagnostic, onRetryPractice, onReturnHome }) => {
  useEffect(() => {
    if (!diagnostic) return;
    if (diagnostic.passed) {
      soundEngine.playFanfare();
      try {
        // Brand palette only. A green particle here was the last non-brand
        // colour in the product and broke the hazard-orange convention.
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#FF6115', '#E24C00', '#F0C419'],
        });
      } catch (e) {}
    } else {
      soundEngine.playWarning();
    }
  }, [diagnostic]);

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

  const formatSeconds = (sec) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}m ${s < 10 ? '0' : ''}${s}s`;
  };

  // Categories the trainee consistently miss → targeted recommendation
  const missedCategories = [...new Set(hazardsMissed.map((h) => h.category).filter(Boolean))];
  const recommendation = !passed
    ? missedCategories.length > 0
      ? `Focus on: ${missedCategories.join(', ')}. Retry Practice Mode before your next official audit.`
      : 'Review the inspection breakdown, then retry in Practice Mode before your next official audit.'
    : missedCategories.length > 0
      ? `Certified, with gaps in: ${missedCategories.join(', ')}. A short practice run is recommended.`
      : 'Fully certified with no missed categories. Schedule retraining per your annual HSE cycle.';

  const handleDownloadReport = () => {
    if (isPracticeMode) return;
    try {
      api.downloadScoreReport([diagnostic], { name: userName });
    } catch (err) {
      console.error('Failed to download score report:', err);
    }
  };

  return (
    <div className="app-page max-w-4xl animate-fade-in py-6">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="app-eyebrow-accent">Assessment complete</p>
          <p className="app-body mt-1">Review the result below or choose your next step.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onRetryPractice} className="app-btn app-btn-secondary">
            Retry in practice
          </button>
          <button
            type="button"
            onClick={handleDownloadReport}
            disabled={isPracticeMode}
            className="app-btn app-btn-secondary"
          >
            Score report
          </button>
          <button type="button" onClick={onReturnHome} className="app-btn app-btn-primary">
            Return to dashboard
          </button>
        </div>
      </header>
      {/* 1. Pass/Fail Compliance Banner */}
      <section
        className={`mb-4 overflow-hidden rounded-panel border p-5 sm:p-7 ${
          passed
            ? 'border-pass-200 bg-pass-50 dark:border-pass-600/40 dark:bg-pass-600/10'
            : 'border-stop-200 bg-stop-50 dark:border-stop-600/40 dark:bg-stop-600/10'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`app-chip ${passed ? 'app-chip-pass' : 'app-chip-stop'}`}>
                {isPracticeMode ? 'Practice assessment' : 'Official compliance audit'}
              </span>
              <span className="app-num text-[11px] text-mist-500 dark:text-dark-muted">
                {new Date(completedAt || Date.now()).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            <h1
              className={`mt-2.5 text-xl font-bold leading-tight sm:text-2xl ${
                passed
                  ? 'text-pass-700 dark:text-pass-200'
                  : 'text-stop-700 dark:text-stop-200'
              }`}
            >
              {passed ? 'Compliance certified' : 'Action required'}
            </h1>
            <p className="app-body mt-1">
              {userName} · {scenarioTitle}
            </p>
          </div>

          <div className="app-card-quiet shrink-0 px-5 py-3 text-right">
            <p className="app-eyebrow">Composite score</p>
            <p className="app-num mt-1 text-3xl font-bold leading-none text-mist-900 dark:text-dark-text">
              {totalScore}%
            </p>
            <p className="app-stat-sub mt-1">{passingThreshold}% required</p>
          </div>
        </div>

        {isPracticeMode && (
          <p className="app-alert app-alert-caution mt-4">
            <Info className="app-alert-icon" aria-hidden="true" />
            <span>
              This was a practice run. It does not overwrite your official compliance audit history.
            </span>
          </p>
        )}
      </section>

      {/* 2. Key Diagnostic Metrics */}
      <div className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-mist-200 bg-mist-200 dark:border-dark-border dark:bg-dark-border lg:grid-cols-4">
        {[
          {
            label: 'Hazards found',
            value: `${foundCount}/${totalHazards}`,
            sub: `${Math.round((foundCount / totalHazards) * 100)}% detection rate`,
          },
          {
            label: 'False clicks',
            value: falseClicksCount,
            sub: `−${falseClicksCount * 5}% accuracy penalty`,
            tone: falseClicksCount > 0 ? 'stop' : 'neutral',
          },
          {
            label: 'Time taken',
            value: formatSeconds(timeTakenSeconds),
            sub: `Limit ${timeLimitSeconds}s`,
          },
          {
            label: 'Quiz score',
            value: `${quizScore}%`,
            sub: 'HSE regulations',
          },
        ].map(({ label, value, sub, tone }) => (
          <div key={label} className="bg-white p-4 dark:bg-dark-card">
            <p className="app-stat-value app-num">
              <span
                className={
                  tone === 'stop' ? 'text-stop-600 dark:text-stop-200' : undefined
                }
              >
                {value}
              </span>
            </p>
            <p className="app-stat-label">{label}</p>
            <p className="app-stat-sub">{sub}</p>
          </div>
        ))}
      </div>

      {/* 2b. Training recommendation */}
      <div className="app-alert app-alert-brand mb-4">
        <Info className="app-alert-icon" aria-hidden="true" />
        <div className="min-w-0">
          <p className="app-eyebrow-accent">Training recommendation</p>
          <p className="mt-1 text-xs text-mist-800 dark:text-dark-text">{recommendation}</p>
          {missedCategories.length > 0 && (
            <p className="mt-1.5 text-[11px] text-mist-600 dark:text-dark-muted">
              Missed this session: {missedCategories.join(' · ')}
            </p>
          )}
        </div>
      </div>

      {/* 3. Corrections Sheet — reference-product analogue: error count first,
             then the procedure for every error that went unnoticed. */}
      <section className="app-card mb-4 overflow-hidden">
        <div className="app-card-head">
          <div>
            <h2 className="app-section-title">Corrections sheet — Bay 4</h2>
            <p className="app-body mt-0.5">
              Review the procedure for each risk that went unnoticed before your next inspection.
            </p>
          </div>
          <span className="app-chip app-chip-neutral shrink-0">
            {missedCount} error{missedCount === 1 ? '' : 's'} of {totalHazards}
          </span>
        </div>
        <div className="p-4 sm:p-5">

        {/* Missed risks are listed first — that is what a corrections sheet is for. */}
        <div className="space-y-2.5">
          {hazardsMissed.map((h, idx) => (
            <article
              key={h.id}
              className="rounded-control border border-stop-200 bg-stop-50 p-4 dark:border-stop-600/40 dark:bg-stop-600/10"
            >
              <div className="flex items-start gap-3">
                <span className="app-num mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stop-600 text-[11px] font-bold text-white">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xs font-bold text-mist-900 sm:text-sm dark:text-dark-text">
                      {h.title}
                    </h3>
                    <span className="app-chip app-chip-stop">Missed</span>
                    <span className="text-[11px] font-semibold text-stop-700 dark:text-stop-200">
                      {h.severity}
                    </span>
                  </div>
                  <p className="app-body mt-1.5">{h.explanation}</p>
                  <p className="mt-2 rounded-control border border-stop-200 bg-white p-2.5 text-[11px] font-semibold text-mist-800 dark:border-stop-600/30 dark:bg-dark-card/70 dark:text-dark-text">
                    <span className="text-stop-700 dark:text-stop-200">Required procedure: </span>
                    {h.correctAction}
                  </p>
                  <p className="app-num mt-1.5 text-[11px] text-mist-500 dark:text-dark-muted">
                    {h.category}
                  </p>
                </div>
              </div>
            </article>
          ))}

          {hazardsMissed.length === 0 && (
            <p className="app-alert app-alert-pass">
              <CheckCircle2 className="app-alert-icon" aria-hidden="true" />
              No errors recorded — every staged risk was identified during this inspection.
            </p>
          )}

          {hazardsFound.map((h) => (
            <article
              key={h.id}
              className="rounded-control border border-mist-200 bg-white p-4 dark:border-dark-border dark:bg-dark-card"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-pass-600 dark:text-pass-200"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xs font-bold text-mist-900 sm:text-sm dark:text-dark-text">
                      {h.title}
                    </h3>
                    <span className="app-chip app-chip-pass">Spotted</span>
                  </div>
                  <p className="app-body mt-1.5">{h.explanation}</p>
                  <p className="app-body mt-1.5 font-semibold">
                    <span className="text-pass-700 dark:text-pass-200">Correct action: </span>
                    {h.correctAction}
                  </p>
                  <p className="app-num mt-1.5 text-[11px] text-mist-500 dark:text-dark-muted">
                    {h.category}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
        </div>
      </section>

      {/* 4. Quiz Review */}
      {quizReview.length > 0 && (
        <section className="app-card mb-4 overflow-hidden">
          <div className="app-card-head">
            <div>
              <h2 className="app-section-title">Safety knowledge review</h2>
              <p className="app-body mt-0.5">
                {quizReview.filter((q) => q.isCorrect).length} of {quizReview.length} answered
                correctly
              </p>
            </div>
          </div>

          <ul className="divide-y divide-mist-100 dark:divide-dark-border/60">
            {quizReview.map((q, idx) => (
              <li key={q.questionId || idx} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-xs font-semibold text-mist-900 dark:text-dark-text">
                    <span className="app-num text-mist-400 dark:text-dark-muted">
                      Q{idx + 1}{' '}
                    </span>
                    {q.question}
                  </p>
                  <span
                    className={`app-chip shrink-0 ${q.isCorrect ? 'app-chip-pass' : 'app-chip-stop'}`}
                  >
                    {q.isCorrect ? (
                      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      <XCircle className="h-3 w-3" aria-hidden="true" />
                    )}
                    {q.isCorrect ? 'Correct' : 'Incorrect'}
                  </span>
                </div>
                <p className="app-body mt-2">
                  <span className="font-semibold text-mist-700 dark:text-dark-text">Standard: </span>
                  {q.explanation}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="app-stat-sub app-divider pt-4">
        Practice runs never overwrite official compliance audits.
      </p>
    </div>
  );
};
