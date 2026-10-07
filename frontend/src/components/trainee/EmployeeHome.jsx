import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Play, RotateCcw, Download, Lock, ShieldAlert } from 'lucide-react';
import { DashboardBanner, Metric, SectionCard, StatTile, TrendChart } from '../ui';

const MODES = [
  {
    id: 'panorama360',
    title: 'Standard 360°',
    desc: 'Panoramic sweep — works on every device',
  },
  {
    id: 'walkthrough',
    title: 'Warehouse Walkthrough',
    desc: 'First-person 3D — phone, tablet & desktop',
  },
];

const scoreTone = (score) => (score >= 75 ? 'pass' : score >= 60 ? 'caution' : 'stop');

export const EmployeeHome = ({ onLaunchSession, scenario, loading }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [history, setHistory] = useState([]);
  const [trainingMode, setTrainingMode] = useState('panorama360');

  useEffect(() => {
    api
      .getMyHistory()
      .then((records) => setHistory(records || []))
      .catch(() => {})
      .finally(() => {});
  }, []);

  const official = history
    .filter((r) => !r.isPracticeMode)
    .sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0));
  const practice = history.filter((r) => r.isPracticeMode);
  const latest = official[0] || null;
  const bestScore = official.length ? Math.max(...official.map((r) => r.totalScore)) : null;
  const passedCount = official.filter((r) => r.passed).length;

  const totalHazards = scenario?.hotspots?.filter((h) => h.isHazard).length || 5;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  /**
   * Personal progress figures, derived from this trainee's own history.
   *
   * Averages hide the shape of someone's learning, so these are the figures
   * that actually tell them where they stand: the last two results and the
   * direction between them, plus how many hazards they typically find.
   */
  const recent = official.slice(0, 5);
  const avgScore = official.length
    ? Math.round(official.reduce((a, r) => a + Number(r.totalScore || 0), 0) / official.length)
    : null;
  const avgTime = official.length
    ? Math.round(
        official.reduce((a, r) => a + Number(r.timeTakenSeconds || 0), 0) / official.length
      )
    : null;
  const avgFalseClicks = official.length
    ? Math.round(
        (official.reduce((a, r) => a + Number(r.falseClicksCount || 0), 0) / official.length) * 10
      ) / 10
    : null;
  const totalSpotted = official.reduce(
    (a, r) => a + (Array.isArray(r.hazardsFound) ? r.hazardsFound.length : 0),
    0
  );
  const avgSpotted = official.length ? Math.round((totalSpotted / official.length) * 10) / 10 : null;

  const [prev, curr] = recent;
  const scoreDelta =
    prev && curr ? Math.round((Number(curr.totalScore || 0) - Number(prev.totalScore || 0)) * 10) / 10 : null;

  /** Seconds to m:ss, so timing is readable at a glance. */
  const mmss = (seconds) => {
    const s = Math.max(0, Math.round(Number(seconds) || 0));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  /** Recent score history as a compact column chart, oldest first. */
  const scoreTrend = [...recent].reverse().map((r) => ({
    date: r.completedAt,
    label: new Date(r.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    value: Number(r.totalScore || 0),
  }));

  return (
    <div className="app-page py-6">
      <div className="app-stack">
        {/* Opening band. Shares one component with the two supervisory dashboards so all
            three open the same way: same shape, same brand treatment, same scale.
            Previously this screen was a plain heading on a white card and read as
            unfinished beside the others.

            The meta plate uses app-banner-stat rather than hand-rolled brand
            tokens: those were tuned for a white page, and on the orange band both
            the plate border and its primary-600 figure disappear. */}
        <DashboardBanner
          eyebrow={`${greeting}, ${user?.name?.split(' ')[0]}`}
          title="Bay 4 Inspection"
          description="Walk the depot, identify the safety infractions, then complete the regulatory quiz."
          meta={
            latest ? (
              <div className="app-banner-stat">
                <p className="app-eyebrow">Latest official result</p>
                <p className="app-num mt-1 text-2xl font-bold leading-none">
                  {latest.totalScore}%
                </p>
                <p className="app-stat-sub mt-1">
                  {latest.passed ? 'Certified' : 'Not yet certified'}
                </p>
              </div>
            ) : (
              <span className="app-chip app-chip-neutral">No attempts yet</span>
            )
          }
        />

        {/* KPI row. Hairline-separated rather than boxed: the tiles sit inside one
            card already, so giving each its own border and shadow would put a
            card inside a card and read as a seam. */}
        <section className="app-card overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-y divide-mist-200 border-t border-mist-200 dark:divide-dark-border dark:border-dark-border lg:grid-cols-4 lg:divide-y-0">
            <div className="p-4">
              <StatTile
                label="Official attempts"
                value={official.length}
                sub={`${practice.length} practice run${practice.length === 1 ? '' : 's'}`}
                flat
              />
            </div>
            <div className="p-4">
              <StatTile
                label="Best score"
                value={bestScore !== null ? `${bestScore}%` : '—'}
                sub={bestScore !== null ? 'Against the 75% threshold' : 'Complete a session'}
                tone={bestScore !== null ? scoreTone(bestScore) : 'neutral'}
                flat
              />
            </div>
            <div className="p-4">
              <StatTile
                label="Sessions passed"
                value={passedCount}
                sub={`${official.length - passedCount} below threshold`}
                tone={passedCount === official.length && official.length > 0 ? 'pass' : 'neutral'}
                flat
              />
            </div>
            <div className="p-4">
              <StatTile label="Hazards staged" value={totalHazards} sub="Re-staged every attempt" flat />
            </div>
          </div>

          {/* Personal progress: the last five results and what they show.
              Rendered only once there is history to show. */}
          {official.length > 0 && (
            <div className="grid gap-5 border-t border-primary-200/70 bg-white/50 p-5 dark:border-dark-border dark:bg-dark-card/40 lg:grid-cols-2">
              <div>
                <p className="app-section-title">Your last {recent.length} official session{recent.length === 1 ? '' : 's'}</p>
                <p className="app-body mt-0.5 mb-3">
                  Scores are marked against the {scenario?.passingScorePercentage ?? 75}% pass threshold.
                </p>
                <ul className="app-stack gap-2">
                  {recent.map((r, i) => {
                    const isLatest = i === 0;
                    return (
                      <li
                        key={r._id || r.completedAt || i}
                        className={`flex items-center justify-between gap-3 rounded-control border px-3 py-2 ${
                          isLatest
                            ? 'border-primary-300 bg-primary-50 dark:border-primary-800 dark:bg-primary-950/30'
                            : 'border-mist-200 dark:border-dark-border'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-mist-800 dark:text-dark-text">
                            {new Date(r.completedAt).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                            {isLatest && <span className="app-chip app-chip-brand ml-2">Latest</span>}
                          </p>
                          <p className="app-num mt-0.5 text-[11px] text-mist-500 dark:text-dark-muted">
                            {mmss(r.timeTakenSeconds)} ·{' '}
                            {(Array.isArray(r.hazardsFound) ? r.hazardsFound.length : 0)}/{totalHazards} found ·{' '}
                            {r.falseClicksCount ?? 0} false click{(r.falseClicksCount ?? 0) === 1 ? '' : 's'}
                          </p>
                        </div>
                        <span
                          className={`app-chip shrink-0 ${r.passed ? 'app-chip-pass' : 'app-chip-stop'}`}
                        >
                          {r.totalScore}%
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div>
                <p className="app-section-title">Score trend</p>
                <p className="app-body mt-0.5 mb-3">
                  {scoreDelta === null
                    ? 'Complete another session to establish a trend.'
                    : scoreDelta > 0
                      ? `Up ${scoreDelta} points on your previous attempt.`
                      : scoreDelta < 0
                        ? `Down ${Math.abs(scoreDelta)} points on your previous attempt.`
                        : 'Level with your previous attempt.'}
                </p>
                <div className="app-chart">
                  {/* A line, not columns: the movement between attempts is what
                      matters, and columns flatten it. The dashed line is the
                      75% pass threshold so each reading is judged against the
                      standard rather than against the axis alone. */}
                  <TrendChart
                    data={scoreTrend}
                    valueKey="value"
                    height={120}
                    domain={[0, 100]}
                    reference={scenario?.passingScorePercentage ?? 75}
                    referenceLabel={`Pass ${scenario?.passingScorePercentage ?? 75}%`}
                    emptyLabel="No completed sessions yet."
                  />
                </div>
                <div className="app-divider mt-4 grid grid-cols-3 gap-3 pt-3">
                  <Metric label="Average" value={avgScore ?? '—'} unit={avgScore === null ? '' : '%'}
                    baseline="All official" />
                  <Metric label="Avg. time" value={avgTime === null ? '—' : mmss(avgTime)}
                    baseline="Per session" />
                  <Metric label="Avg. spotted" value={avgSpotted ?? '—'} baseline={`of ${totalHazards}`} />
                </div>
                {avgFalseClicks > 0 && (
                  <p className="app-body mt-3">
                    You average {avgFalseClicks} false click{avgFalseClicks === 1 ? '' : 's'} per
                    session. Each one costs 5% accuracy, so slowing down is worth more than guessing.
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Launch + briefing */}
        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard
            className="lg:col-span-2"
            title={loading ? 'Loading scenario…' : scenario?.title || 'Bay 4: Automotive Logistics'}
            description={scenario?.description}
            actions={<span className="app-chip app-chip-brand">Active scenario</span>}
          >
            <div className="space-y-4">
              <div>
                <p className="app-label">Training mode</p>
                <div className="app-seg">
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setTrainingMode(m.id)}
                      aria-pressed={trainingMode === m.id}
                      className={`app-seg-item text-left ${
                        trainingMode === m.id ? 'app-seg-item-active' : ''
                      }`}
                    >
                      <span className="block">{m.title}</span>
                      <span className="mt-0.5 block text-[11px] font-medium text-mist-500 dark:text-dark-muted">
                        {m.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => onLaunchSession(false, trainingMode)}
                  disabled={loading}
                  className="app-btn app-btn-primary flex-1 py-2.5"
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                  Begin official compliance session
                </button>
                <button
                  type="button"
                  onClick={() => onLaunchSession(true, trainingMode)}
                  disabled={loading}
                  className="app-btn app-btn-secondary flex-1 py-2.5"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Practice run
                </button>
              </div>

              <p className="app-alert app-alert-brand">
                <Lock className="app-alert-icon" aria-hidden="true" />
                <span>
                  Official sessions are written to the enterprise compliance record and are visible to
                  your HSE supervisor. Practice runs never affect your standing.
                </span>
              </p>
            </div>
          </SectionCard>

          <SectionCard title="Scoring" description="How the composite score is built">
            <dl className="space-y-2.5">
              {[
                ['Hazard spotted', '+20%', 'Each of the staged hazards', 'pass'],
                ['False click', '−5%', 'Accuracy penalty per false alarm', 'stop'],
                ['Safety quiz', '40%', 'Weight of the knowledge component', 'brand'],
                ['Pass threshold', '75%', 'Required for certification', 'caution'],
              ].map(([label, value, desc, tone]) => (
                <li
                  key={label}
                  className="app-card-quiet flex items-baseline justify-between gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold text-mist-800 dark:text-dark-text">
                      {label}
                    </dt>
                    <dd className="app-body mt-0.5">{desc}</dd>
                  </div>
                  <dd
                    className={`app-num shrink-0 text-sm font-bold ${
                      tone === 'stop'
                        ? 'text-mist-800 dark:text-dark-text'
                        : tone === 'pass'
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-primary-700 dark:text-primary-300'
                    }`}
                  >
                    {value}
                  </dd>
                </li>
              ))}
            </dl>
          </SectionCard>
        </div>

        {/* ── History ── */}
        {history.length > 0 && (
          <SectionCard
            title="Your compliance history"
            description={`${official.length} official · ${practice.length} practice`}
            actions={
              <button
                type="button"
                onClick={() => {
                  try {
                    api.downloadScoreReport(official, user);
                    showToast('Score report downloaded', 'success');
                  } catch (err) {
                    showToast(err.message, 'error');
                  }
                }}
                disabled={official.length === 0}
                className="app-btn app-btn-secondary app-btn-sm"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Score report
              </button>
            }
            bodyClass="p-0"
          >
            <div className="app-table-wrap">
              <table className="app-table">
                <thead>
                  <tr>
                    <th className="app-th">Date</th>
                    <th className="app-th">Mode</th>
                    <th className="app-th">Hazards</th>
                    <th className="app-th">False clicks</th>
                    <th className="app-th text-right">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 8).map((rec, i) => (
                    <tr key={rec._id || i}>
                      <td className="app-td whitespace-nowrap font-semibold text-mist-800 dark:text-dark-text">
                        {new Date(rec.completedAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="app-td">
                        {rec.isPracticeMode ? (
                          <span className="app-chip app-chip-caution">Practice</span>
                        ) : rec.passed ? (
                          <span className="app-chip app-chip-pass">Passed</span>
                        ) : (
                          <span className="app-chip app-chip-stop">Below threshold</span>
                        )}
                      </td>
                      <td className="app-td app-num">
                        {rec.hazardsFound?.length ?? 0}/
                        {(rec.hazardsFound?.length ?? 0) + (rec.hazardsMissed?.length ?? 0)}
                      </td>
                      <td className="app-td app-num">{rec.falseClicksCount}</td>
                      <td className="app-td text-right">
                        <span
                          className={`app-num text-sm font-bold ${
                            rec.isPracticeMode
                              ? 'text-mist-500 dark:text-dark-muted'
                              : rec.passed
                                ? 'text-pass-600 dark:text-pass-200'
                                : 'text-stop-600 dark:text-stop-200'
                          }`}
                        >
                          {rec.totalScore}%
                        </span>
                        <span className="app-num block text-[11px] text-mist-400 dark:text-dark-muted">
                          {rec.hazardScore}% + {rec.quizScore}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {history.length === 0 && (
          <div className="app-card-quiet flex items-center gap-3 p-4">
            <ShieldAlert className="h-5 w-5 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden="true" />
            <p className="app-body">
              No recorded sessions yet. Your first official run establishes your baseline.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};