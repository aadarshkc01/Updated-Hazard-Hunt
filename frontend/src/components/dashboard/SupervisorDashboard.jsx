import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { ConfirmModal } from '../common/ConfirmModal';
import { UserAuditModal } from '../common/UserAuditModal';
import { soundEngine } from '../../utils/audio';
import { PageHeader, StatTile, BarList, ColumnChart, Metric, EmptyState, SectionCard } from '../ui';
import { CheckCircle2, Download, UserPlus, Search, RefreshCw, ChevronRight, X, Activity, Eye, ArrowUpRight, ArrowDownRight, Shield, Trash2, Target } from 'lucide-react';

// ── Semantic tone maps ────────────────────────────────────────────────────────
// Three semantic tones carry state - pass / caution / stop - expressed by
// visual weight, not by adding a hue. Nothing else does.
const STATUS_TONE = {
  PASS: 'app-chip-pass',
  FAIL: 'app-chip-stop',
  PENDING: 'app-chip-neutral',
};

const RISK_TONE = {
  CRITICAL: 'app-chip-stop',
  MEDIUM: 'app-chip-caution',
  LOW: 'app-chip-pass',
};

// ── Score ring tone (pass rate band) ──────────────────────────────────────────
const scoreTone = (pct) =>
  pct >= 75 ? 'text-pass-600 dark:text-pass-200'
    : pct >= 50 ? 'text-caution-600 dark:text-caution-200'
      : 'text-stop-600 dark:text-stop-200';

// ── Animated Score Ring (CSS) ────────────────────────────────────────────────
const ScoreRing = ({ score, size = 80, strokeWidth = 7, color = 'currentColor', className = '' }) => {
  const r = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = ((100 - score) / 100) * circumference;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor"
        strokeWidth={strokeWidth} className="text-mist-200 dark:text-dark-surface" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
        strokeWidth={strokeWidth} strokeDasharray={circumference}
        strokeDashoffset={progress} strokeLinecap="round" className={className}
        style={{ transition: 'stroke-dashoffset 1s ease' }} />
    </svg>
  );
};

export const SupervisorDashboard = () => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Trainee audit drawer
  const [selectedTrainee, setSelectedTrainee] = useState(null);
  const [auditDetails, setAuditDetails] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);

  // Create account modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState('Inbound Logistics Bay 4');
  const [isCreating, setIsCreating] = useState(false);

  const [traineePendingDelete, setTraineePendingDelete] = useState(null);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [teamRes, analyticsRes] = await Promise.all([
        api.getTeamDashboard(),
        api.getAnalyticsSummary(),
      ]);
      if (teamRes.success) setData(teamRes);
      if (analyticsRes.success) setAnalytics(analyticsRes);
      setLastRefresh(new Date());
    } catch (err) {
      showToast('Error syncing supervisor metrics: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  const handleRefresh = () => {
    soundEngine.playTick();
    fetchAllData();
    showToast('Dashboard synced', 'info');
  };

  const handleDeleteUser = async (userId, userName) => {
    setTraineePendingDelete({ id: userId, name: userName });
  };

  const confirmDeleteUser = async () => {
    if (!traineePendingDelete) return;
    try {
      await api.deleteUser(traineePendingDelete.id);
      showToast(`Trainee ${traineePendingDelete.name} deleted successfully`, 'success');
      fetchAllData();
    } catch (err) {
      showToast(err.message || 'Failed to delete trainee', 'error');
    } finally {
      setTraineePendingDelete(null);
    }
  };

  const handleExportCSV = async () => {
    soundEngine.playSuccess();
    try {
      await api.downloadComplianceCSV();
      showToast('Compliance report exported successfully', 'success');
    } catch (err) {
      showToast('Failed to export: ' + err.message, 'error');
    }
  };

  const handleInspectTrainee = async (trainee) => {
    setSelectedTrainee({ ...trainee, role: 'employee' });
    setAuditLoading(true);
    soundEngine.playTick();
    try {
      const res = await api.getTraineeAudit(trainee.id);
      if (res.success) setAuditDetails(res);
    } catch (err) {
      showToast('Failed to load trainee audit', 'error');
    } finally {
      setAuditLoading(false);
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    soundEngine.playTick();
    try {
      await api.createAccount({ name: newName, username: newUsername, password: newPassword, role: 'employee', department: newDept });
      soundEngine.playSuccess();
      showToast(`Employee account created for ${newName}`, 'success');
      setNewName(''); setNewUsername(''); setNewPassword('');
      setIsCreateModalOpen(false);
      fetchAllData();
    } catch (err) {
      soundEngine.playWarning();
      showToast(err.message || 'Failed to create account', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const stats = data?.stats || {};
  const team = data?.team || [];
  const filteredTeam = team.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.department || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Labelled tabs, no icons: three icons in a row beside three labels is
  // decoration, and the section names are already unambiguous.
  const tabs = [
    { id: 'dashboard', label: 'Team Dashboard' },
    { id: 'trainees', label: 'Trainee Records' },
    { id: 'analytics', label: 'Risk Analytics' },
  ];

  const passRate = stats.passRatePercentage || 0;
  const avgScore = stats.averageScorePercentage ?? 0;

  // Derived analytics, computed server-side from the same record set as the
  // category breakdown so the two views can never disagree.
  const derived = analytics?.analytics ?? null;
  const totalAttempts = analytics?.totalAudits ?? 0;
  const trend = derived?.scoreTrend ?? null;
  const trendChip =
    trend?.direction === 'IMPROVING' ? 'app-chip-pass'
      : trend?.direction === 'DECLINING' ? 'app-chip-stop'
        : trend?.direction === 'STABLE' ? 'app-chip-caution'
          : 'app-chip-neutral';
  const trendLabel =
    trend?.direction === 'IMPROVING' ? 'Improving'
      : trend?.direction === 'DECLINING' ? 'Declining'
        : trend?.direction === 'STABLE' ? 'Holding steady'
          : 'Not enough data';

  /** Seconds to m:ss, so timing figures are readable at a glance. */
  const mmss = (seconds) => {
    const s = Math.max(0, Math.round(Number(seconds) || 0));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <div className="app-page py-6">
      {/* The brand navbar, theme toggle and sign-out live in AppShell, so this
          page opens with the shared PageHeader rather than a hand-rolled
          toolbar — that mismatch in indent and vertical rhythm is what made this
          dashboard sit differently from the other two. */}
      <PageHeader
        eyebrow="HSE Supervisor Console"
        title="Team Compliance Dashboard"
        description="Monitor your team's warehouse hazard training sessions, track certification status, and identify risk patterns across the bays."
        actions={
          <>
            {lastRefresh && (
              <span className="app-eyebrow hidden sm:inline-flex sm:items-center sm:gap-1.5">
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-primary-500' : ''}`}
                  aria-hidden="true"
                />
                Synced {lastRefresh.toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
            <button
              onClick={handleRefresh}
              className="app-icon-btn"
              title="Sync dashboard"
              aria-label="Sync dashboard"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin text-primary-500' : ''}`}
              />
            </button>
            <button
              onClick={handleExportCSV}
              className="app-btn app-btn-secondary hidden sm:inline-flex"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="app-btn app-btn-primary"
            >
              <UserPlus className="h-3.5 w-3.5" /> Add Trainee
            </button>
          </>
        }
      />

      <div className="mb-5">
        <div className="app-seg self-start">
          {tabs.map(({ id, label }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`app-seg-item whitespace-nowrap ${activeTab === id ? 'app-seg-item-active' : ''}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── DASHBOARD TAB ────────────────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div className="app-stack animate-fade-in">

          {/* Score band. This used to carry a second copy of the page title,
              which doubled the heading once the real header moved to the top of
              the page. It now holds only the figure it exists to show. */}
          <div className="app-band flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <ScoreRing
                  score={passRate}
                  size={72}
                  strokeWidth={6}
                  className={scoreTone(passRate)}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="app-num text-sm font-bold">{passRate}%</span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="app-eyebrow-accent">Team pass rate</p>
                <p className="app-body mt-1">
                  {stats.totalEmployees ?? 0} registered · {stats.passedCount ?? 0} cleared ·{' '}
                  {stats.failedCount ?? 0} failed
                </p>
              </div>
            </div>
            <span
              className={`app-chip ${
                passRate >= 75
                  ? 'app-chip-pass'
                  : passRate > 0
                    ? 'app-chip-caution'
                    : 'app-chip-neutral'
              }`}
            >
              {passRate >= 75 ? 'On target' : passRate > 0 ? 'Below target' : 'No data'}
            </span>
          </div>

          {/* KPI row */}
          <div className="app-stat-row">
            <StatTile label="Total Trainees" value={stats.totalEmployees ?? 0}
              sub="Registered employees" />
            <StatTile label="Passed" value={stats.passedCount ?? 0} tone="pass"
              meter={passRate}
              sub={
                <span className="inline-flex items-center gap-1">
                  {passRate >= 75
                    ? <ArrowUpRight className="h-3.5 w-3.5 text-pass-600 dark:text-pass-200" />
                    : <ArrowDownRight className="h-3.5 w-3.5 text-stop-600 dark:text-stop-200" />}
                  {`${stats.passRatePercentage ?? 0}% pass rate`}
                </span>
              } />
            <StatTile label="Failed / Pending" value={(stats.failedCount ?? 0) + (stats.pendingCount ?? 0)}
              tone="stop"
              sub={`${stats.failedCount ?? 0} failed · ${stats.pendingCount ?? 0} pending`} />
            <StatTile label="Avg. Score" value={`${avgScore}%`} tone="brand" meter={avgScore}
              sub={derived ? `Median ${derived.medianScore}% · ${derived.officialAttempts} official` : 'Official sessions only'} />
          </div>

          {/* ── Derived analytics ──────────────────────────────────────────────
              Figures that answer "what should I do next?" rather than
              restating the same counts: detection accuracy, timing spread,
              cohort direction, and the single biggest training gap. */}
          {derived && totalAttempts > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard
                title="Detection Accuracy"
                description="Of everything clicked, how much was a real hazard"
                bodyClass="p-4"
              >
                <div className="grid grid-cols-3 gap-3">
                  <Metric
                    label="Precision"
                    value={derived.detectionAccuracyPercentage}
                    unit="%"
                    baseline={`${derived.totalSpotted} real`}
                  />
                  <Metric
                    label="False clicks"
                    value={derived.totalFalseClicks}
                    baseline="Across all sessions"
                    invert
                  />
                  <Metric
                    label="Missed"
                    value={derived.totalMissed}
                    baseline="Never reported"
                    invert
                  />
                </div>
                <div className="app-divider mt-4 pt-3">
                  <Metric
                    label="Median completion time"
                    value={mmss(derived.medianTimeTakenSeconds)}
                    baseline={`Slowest 10% ${mmss(derived.p90TimeTakenSeconds)} · fastest ${mmss(derived.fastestTimeSeconds)}`}
                  />
                </div>
              </SectionCard>

              <SectionCard
                title="7-Day Activity"
                description="Sessions completed per day"
                bodyClass="p-4"
                actions={<span className={`app-chip ${trendChip}`}>{trendLabel}</span>}
              >
                <div className="app-chart">
                  <ColumnChart
                    data={derived.weeklyActivity ?? []}
                    valueKey="attempts"
                    formatValue={(v) => `${v} sessions`}
                  />
                </div>
                <div className="app-divider mt-4 pt-3">
                  <Metric
                    label="Score movement"
                    value={derived.recentAvg}
                    unit="%"
                    delta={trend?.deltaPoints ?? null}
                    baseline={
                      trend?.direction === 'INSUFFICIENT_DATA'
                        ? 'Needs at least 2 sessions'
                        : `Earlier average ${trend?.earlierAvg}%`
                    }
                  />
                </div>
              </SectionCard>
            </div>
          )}

          {derived?.topGapCategory && (
            <div className="app-alert app-alert-caution">
              <Target className="app-alert-icon" aria-hidden="true" />
              <span>
                <strong>Priority training gap:</strong> {derived.topGapCategory.category} is missed{' '}
                {derived.topGapCategory.missRatePercentage}% of the time (
                {derived.topGapCategory.missed} occurrence
                {derived.topGapCategory.missed === 1 ? '' : 's'}). Schedule a toolbox talk on this
                category before the next assessment window.
              </span>
            </div>
          )}

          {/* Compliance progress bar display */}
          <SectionCard title="Team Compliance Breakdown"
            description="Share of the team by certification state">
            <div className="app-stack gap-4">
              {[
                { label: 'Passed', value: stats.passedCount ?? 0, total: stats.totalEmployees || 1, fill: 'app-meter-fill-pass' },
                { label: 'Failed', value: stats.failedCount ?? 0, total: stats.totalEmployees || 1, fill: 'app-meter-fill-stop' },
                { label: 'Pending (Not Attempted)', value: stats.pendingCount ?? 0, total: stats.totalEmployees || 1, fill: 'bg-mist-300 dark:bg-dark-raised' },
              ].map(({ label, value, total, fill }) => {
                const pct = Math.round((value / total) * 100);
                return (
                  <div key={label}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-mist-700 dark:text-dark-muted">{label}</span>
                      <span className="app-num text-xs font-bold text-mist-900 dark:text-dark-text">
                        {value} employees ({pct}%)
                      </span>
                    </div>
                    <div className="app-meter">
                      <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* Quick trainee preview */}
          <SectionCard
            title="Recent Trainee Activity"
            bodyClass=""
            actions={
              <button onClick={() => setActiveTab('trainees')} className="app-btn app-btn-ghost app-btn-sm">
                View All <ChevronRight className="h-3.5 w-3.5" />
              </button>
            }
          >
            <div className="divide-y divide-mist-100 dark:divide-dark-border">
              {team.slice(0, 5).map(e => (
                <div key={e.id}
                  className="group flex cursor-pointer items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-mist-50 dark:hover:bg-dark-surface/40"
                  onClick={() => handleInspectTrainee(e)}>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="app-icon-well h-8 w-8 text-xs font-bold">{e.name.charAt(0)}</div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-mist-900 dark:text-dark-text">{e.name}</p>
                      <p className="truncate text-[11px] text-mist-500 dark:text-dark-muted">{e.department}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={`app-chip ${STATUS_TONE[e.status] || STATUS_TONE.PENDING}`}>{e.status}</span>
                    {e.latestScore !== null && (
                      <span className="app-num hidden text-xs font-bold text-mist-700 dark:text-dark-text sm:block">{e.latestScore}%</span>
                    )}
                    <ChevronRight className="h-3.5 w-3.5 text-mist-400 transition-colors group-hover:text-primary-500" />
                  </div>
                </div>
              ))}
              {team.length === 0 && !loading && (
                <EmptyState
                  title="No trainee accounts yet"
                  description="Add employees using the button above to start tracking compliance."
                />
              )}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── TRAINEES TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'trainees' && (
        <div className="app-stack animate-fade-in">
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute inset-y-0 left-3.5 my-auto h-4 w-4 text-mist-400" aria-hidden="true" />
              <input type="text" placeholder="Search trainees by name, username, department…"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="app-input pl-10" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="app-input w-auto" aria-label="Filter by status">
              <option value="ALL">All Statuses</option>
              <option value="PASS">Passed</option>
              <option value="FAIL">Failed</option>
              <option value="PENDING">Pending</option>
            </select>
            <button onClick={() => setIsCreateModalOpen(true)} className="app-btn app-btn-primary whitespace-nowrap">
              <UserPlus className="h-3.5 w-3.5" /> New Employee
            </button>
            <button onClick={handleExportCSV} className="app-btn app-btn-secondary whitespace-nowrap">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>

          {/* Trainee data table */}
          <SectionCard bodyClass="p-0">
            <div className="app-table-wrap">
              <table className="app-table">
                <thead>
                  <tr>
                    <th className="app-th">Trainee</th>
                    <th className="app-th">Status</th>
                    <th className="app-th hidden sm:table-cell">Score</th>
                    <th className="app-th hidden md:table-cell">Hazards Found</th>
                    <th className="app-th hidden lg:table-cell">Sessions</th>
                    <th className="app-th hidden lg:table-cell">Last Attempt</th>
                    <th className="app-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeam.map(e => (
                    <tr key={e.id} className="group transition-colors hover:bg-mist-50 dark:hover:bg-dark-surface/30">
                      <td className="app-td">
                        <div className="flex items-center gap-2.5">
                          <div className="app-icon-well h-8 w-8 text-xs font-bold">{e.name.charAt(0)}</div>
                          <div>
                            <p className="font-semibold text-mist-900 dark:text-dark-text">{e.name}</p>
                            <p className="app-num text-[11px] text-mist-500 dark:text-dark-muted">@{e.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="app-td">
                        <span className={`app-chip ${STATUS_TONE[e.status] || STATUS_TONE.PENDING}`}>{e.status}</span>
                      </td>
                      <td className="app-td hidden sm:table-cell">
                        {e.latestScore !== null ? (
                          <span className="app-num font-bold text-mist-900 dark:text-dark-text">{e.latestScore}%</span>
                        ) : <span className="text-mist-400">—</span>}
                      </td>
                      <td className="app-td hidden md:table-cell">
                        {e.hasAttempted ? (
                          <span className="app-num text-mist-700 dark:text-dark-muted">
                            {e.hazardsFoundCount}/{e.hazardsFoundCount + e.hazardsMissedCount}
                          </span>
                        ) : <span className="text-mist-400">—</span>}
                      </td>
                      <td className="app-td app-num hidden lg:table-cell text-mist-500 dark:text-dark-muted">
                        {e.totalAttempts}
                      </td>
                      <td className="app-td app-num hidden text-[11px] text-mist-400 lg:table-cell dark:text-dark-muted">
                        {e.lastAttemptDate ? new Date(e.lastAttemptDate).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td className="app-td">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleInspectTrainee(e)} className="app-btn app-btn-secondary app-btn-sm">
                            <Eye className="h-3 w-3" /> View
                          </button>
                          <button onClick={(event) => { event.stopPropagation(); handleDeleteUser(e.id, e.name); }}
                            className="app-icon-btn h-8 w-8 hover:border-stop-600 hover:text-stop-600 dark:hover:text-stop-200"
                            title="Delete Trainee" aria-label={`Delete ${e.name}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredTeam.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6">
                        <EmptyState
                          title="No trainees match your filters"
                          description="Adjust the search term or status filter to see more records."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="app-divider bg-mist-50 px-4 py-2.5 dark:bg-dark-surface/40">
              <p className="app-num text-[11px] text-mist-500 dark:text-dark-muted">
                {filteredTeam.length} of {team.length} trainees · {stats.passedCount ?? 0} passed · {stats.failedCount ?? 0} failed · {stats.pendingCount ?? 0} pending
              </p>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── ANALYTICS TAB ────────────────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div className="app-stack animate-fade-in">
          {/* Summary row */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile label="Total Audit Sessions" value={analytics?.totalAudits ?? 0}
              sub="Official + practice combined" />
            <StatTile label="Avg. Session Time" value={`${analytics?.avgTimeTakenSeconds ?? 0} sec`}
              sub="Time to complete 360° inspection" />
            <StatTile label="Avg. False Clicks" value={analytics?.avgFalseClicksCount ?? 0}
              tone={Number(analytics?.avgFalseClicksCount ?? 0) > 0 ? 'caution' : 'neutral'}
              sub="Penalty clicks per session (avg)" />
          </div>

          {/* Category miss rate analysis */}
          <div className="app-stack gap-2.5">
            <p className="app-eyebrow-accent flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" aria-hidden="true" /> Safety analytics
            </p>
            <SectionCard title="Hazard category vulnerability"
              description="Ranked by miss rate — the hazard types the team overlooks most.">
              {analytics?.categoryBreakdown?.length > 0 ? (
                <div className="app-stack gap-4">
                  {analytics.categoryBreakdown.sort((a, b) => b.missRatePercentage - a.missRatePercentage).map(cat => (
                    <div key={cat.category}>
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-xs font-semibold text-mist-800 dark:text-dark-text">{cat.category}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="app-num text-[11px] text-mist-500 dark:text-dark-muted">
                            {cat.spotted} spotted · {cat.missed} missed
                          </span>
                          <span className={`app-chip ${RISK_TONE[cat.riskLevel] || RISK_TONE.LOW}`}>
                            {cat.riskLevel} · {cat.missRatePercentage}%
                          </span>
                        </div>
                      </div>
                      <div className="app-meter">
                        <div className={`h-full rounded-full ${cat.riskLevel === 'CRITICAL' ? 'app-meter-fill-stop' : 'app-meter-fill'}`}
                          style={{ width: `${cat.missRatePercentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No category data yet"
                  description="Analytics will populate once trainees complete sessions."
                />
              )}
            </SectionCard>
          </div>

          {/* Score distribution */}
          <SectionCard title="Score distribution"
            description="Sessions per performance band">
            <BarList
              items={[
                { label: 'Distinction (90–100%)', value: analytics?.scoreDistribution?.distDistinction ?? 0, tone: 'pass' },
                { label: 'Pass (75–89%)', value: analytics?.scoreDistribution?.distPass ?? 0, tone: 'pass' },
                { label: 'Near-Miss (60–74%)', value: analytics?.scoreDistribution?.distNearMiss ?? 0, tone: 'caution' },
                { label: 'Fail (<60%)', value: analytics?.scoreDistribution?.distFail ?? 0, tone: 'stop' },
              ]}
              valueSuffix=""
              emptyLabel="No scored sessions recorded yet"
            />
          </SectionCard>
        </div>
      )}

      <UserAuditModal
        user={selectedTrainee}
        audit={auditDetails}
        loading={auditLoading}
        onClose={() => { setSelectedTrainee(null); setAuditDetails(null); }}
        onDownload={() => api.downloadScoreReport(auditDetails?.records || [], selectedTrainee)}
      />

      {/* ── CREATE EMPLOYEE MODAL ─────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="app-card w-full max-w-md overflow-hidden shadow-pop animate-slide-up">
            <div className="app-band flex items-start justify-between gap-3 border-b px-5 py-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="app-icon-well"><UserPlus className="h-4 w-4" /></div>
                <div className="min-w-0">
                  <h3 className="app-title">Create Employee Account</h3>
                  <p className="app-body mt-0.5">Supervisors may create Employee (Trainee) accounts only</p>
                </div>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="app-icon-btn shrink-0"
                title="Close" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateEmployee} className="app-stack gap-4 p-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="app-label">Full Name *</label>
                  <input type="text" required placeholder="e.g. James Walker" value={newName} onChange={e => setNewName(e.target.value)}
                    className="app-input" />
                </div>
                <div>
                  <label className="app-label">Username *</label>
                  <input type="text" required placeholder="e.g. trainee5" value={newUsername} onChange={e => setNewUsername(e.target.value)}
                    className="app-input" />
                </div>
              </div>
              <div>
                <label className="app-label">Password *</label>
                <input type="password" required placeholder="Min. 6 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  className="app-input" />
              </div>
              <div>
                <label className="app-label">Department</label>
                <input type="text" value={newDept} onChange={e => setNewDept(e.target.value)}
                  className="app-input" />
              </div>
              <div className="app-alert app-alert-caution">
                <Shield className="app-alert-icon" aria-hidden="true" />
                <span>Supervisors are restricted to provisioning Employee (Trainee) accounts only. Contact your System Administrator to create Supervisor accounts.</span>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="app-btn app-btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={isCreating} className="app-btn app-btn-primary flex-1">
                  {isCreating
                    ? <><span className="app-spinner" /> Creating…</>
                    : <><CheckCircle2 className="h-3.5 w-3.5" /> Create Employee</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(traineePendingDelete)}
        title="Delete Trainee Account"
        message={`Are you sure you want to delete ${traineePendingDelete?.name || 'this trainee'}? This action cannot be undone.`}
        confirmText="Delete Trainee"
        cancelText="Keep Trainee"
        isDestructive
        onConfirm={confirmDeleteUser}
        onCancel={() => setTraineePendingDelete(null)}
      />
    </div>
  );
};
