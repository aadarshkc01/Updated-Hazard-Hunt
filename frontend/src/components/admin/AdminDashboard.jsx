import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { soundEngine } from '../../utils/audio';
import { Server, Database, Layers, UserPlus, Users, Search, CheckCircle2, RefreshCw, Lock, X, Activity, Shield, AlertTriangle, ChevronRight, Cpu, Wifi, HardDrive, Download, Target } from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { UserAuditModal } from '../common/UserAuditModal';
import { DashboardBanner, StatTile, BarList, ColumnChart, Metric, EmptyState, SectionCard } from '../ui';

export const AdminDashboard = ({ onLaunchTrainer }) => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('overview');
  const [scenario, setScenario] = useState(null);
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [lastRefresh, setLastRefresh] = useState(null);

  // Create user modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('supervisor');
  const [newDept, setNewDept] = useState('Health, Safety & Environment');
  const [isCreating, setIsCreating] = useState(false);

  const [userPendingDelete, setUserPendingDelete] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserAudit, setSelectedUserAudit] = useState(null);
  const [userAuditLoading, setUserAuditLoading] = useState(false);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [sc, userList, analyticsRes, teamRes] = await Promise.all([
        api.getActiveScenario(),
        api.getAllUsers(),
        api.getAnalyticsSummary(),
        api.getTeamDashboard(),
      ]);
      setScenario(sc);
      setUsers(userList || []);
      setAnalytics(analyticsRes);
      setTeamData(teamRes);
      setLastRefresh(new Date());
    } catch (err) {
      showToast('Failed to load admin data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAllData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    soundEngine.playTick();
    try {
      await api.createAccount({ name: newName, username: newUsername, password: newPassword, role: newRole, department: newDept });
      soundEngine.playSuccess();
      showToast(`Account provisioned: ${newName} as ${newRole.toUpperCase()}`, 'success');
      setNewName(''); setNewUsername(''); setNewPassword('');
      setIsCreateModalOpen(false);
      fetchAllData();
    } catch (err) {
      soundEngine.playWarning();
      showToast(err.message || 'Failed to create user', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRefresh = () => {
    soundEngine.playTick();
    fetchAllData();
    showToast('Dashboard synced', 'info');
  };

  const handleDeleteUser = async (userId, userName) => {
    setUserPendingDelete({ id: userId, name: userName });
  };

  const confirmDeleteUser = async () => {
    if (!userPendingDelete) return;
    try {
      const res = await api.deleteUser(userPendingDelete.id);
      // The account is gone, but its compliance records are deliberately kept as
      // audit evidence, so the count is surfaced rather than left as a silent
      // orphan an auditor would have to discover.
      const kept = res?.retainedComplianceRecords;
      showToast(
        kept
          ? `${userPendingDelete.name} deleted. ${kept} compliance record${
              kept === 1 ? '' : 's'
            } retained for audit.`
          : `User ${userPendingDelete.name} deleted successfully`,
        'success'
      );
      fetchAllData();
    } catch (err) {
      showToast(err.message || 'Failed to delete user', 'error');
    } finally {
      setUserPendingDelete(null);
    }
  };

  const handleExportCSV = async () => {
    try {
      await api.downloadComplianceCSV();
      showToast('Compliance report exported successfully', 'success');
    } catch (err) {
      showToast('Failed to export: ' + err.message, 'error');
    }
  };

  const handleViewUser = async (account) => {
    setSelectedUser(account);
    setSelectedUserAudit(null);
    if (account.role !== 'employee') return;

    setUserAuditLoading(true);
    try {
      const audit = await api.getTraineeAudit(account._id);
      if (audit.success) setSelectedUserAudit(audit);
    } catch (err) {
      showToast('Failed to load employee score history', 'error');
    } finally {
      setUserAuditLoading(false);
    }
  };

  const handleDownloadUserReport = () => {
    try {
      api.downloadScoreReport(selectedUserAudit?.records || [], selectedUser);
      showToast('Score report downloaded', 'success');
    } catch (err) {
      showToast('Failed to download report: ' + err.message, 'error');
    }
  };

  const filteredUsers = users.filter(u => {
    // `department` carries a model default but is not `required`, and the five
    // oldest accounts predate it, so it arrives undefined. Calling
    // `.toLowerCase()` on it threw and unmounted the whole dashboard the moment
    // the first two operands stopped matching a search term - which is exactly
    // why an empty box looked fine and only a hard refresh restored the page.
    const matchSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.department || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const adminCount = users.filter(u => u.role === 'admin').length;
  const supervisorCount = users.filter(u => u.role === 'supervisor').length;
  const employeeCount = users.filter(u => u.role === 'employee').length;
  const passRate = teamData?.stats?.passRatePercentage ?? 0;
  const avgScore = teamData?.stats?.averageScorePercentage ?? 0;
  const totalAttempts = analytics?.totalAudits ?? 0;
  const worstCategory = analytics?.categoryBreakdown?.sort((a, b) => b.missRatePercentage - a.missRatePercentage)[0];

  // ── Semantic tone helpers — only ok / warn / bad / brand are ever used ────
  const passTone = (value) => (value >= 75 ? 'pass' : value > 0 ? 'caution' : 'neutral');
  const scoreTone = (value) => (value >= 75 ? 'pass' : value >= 60 ? 'caution' : value > 0 ? 'stop' : 'neutral');
  const riskTone = (missRate) => (missRate > 40 ? 'stop' : missRate > 20 ? 'caution' : 'pass');
  const riskChip = (missRate) => (missRate > 40 ? 'app-chip-stop' : missRate > 20 ? 'app-chip-caution' : 'app-chip-pass');


  // Derived metrics, all computed server-side from the same record set as the
  // category breakdown so the two can never disagree with each other.
  const derived = analytics?.analytics ?? null;
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

  // Score distribution, expressed as a share of every logged session.
  const scoreBands = [
    { label: 'Distinction (90–100%)', value: analytics?.scoreDistribution?.distDistinction ?? 0, tone: 'pass' },
    { label: 'Pass (75–89%)', value: analytics?.scoreDistribution?.distPass ?? 0, tone: 'brand' },
    { label: 'Near-Miss (60–74%)', value: analytics?.scoreDistribution?.distNearMiss ?? 0, tone: 'caution' },
    { label: 'Fail (<60%)', value: analytics?.scoreDistribution?.distFail ?? 0, tone: 'stop' },
  ].map(({ label, value, tone }) => {
    const share = totalAttempts > 0 ? Math.round((value / totalAttempts) * 100) : 0;
    return { label, value: share, tone, display: `${value} sessions · ${share}%` };
  });

  // Hazard miss-rate radar, straight from the analytics payload.
  const radarItems = (analytics?.categoryBreakdown ?? []).map(cat => ({
    label: cat.category,
    value: cat.missRatePercentage,
    tone: riskTone(cat.missRatePercentage),
    display: `${cat.riskLevel} · ${cat.missRatePercentage}%`,
  }));

  // Spot vs miss split per category — the other half of the picture, and what
  // shows whether a high miss rate is a broad problem or a narrow one.
  const balanceItems = (analytics?.categoryBreakdown ?? []).map(cat => ({
    label: cat.category,
    value: cat.totalOccurrences,
    tone: riskTone(cat.missRatePercentage),
    display: `${cat.spotted} spotted · ${cat.missed} missed`,
  }));

  // Tabs are labelled, not icon-led. An icon beside every tab label competes with
  // the text instead of aiding it, and the four tabs sit directly under a page
  // header that already names the section.
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'User Management' },
    { id: 'analytics', label: 'Safety Analytics' },
    { id: 'system', label: 'System Status' },
  ];

  return (
    <div>
      <div className="app-page py-6">
        {/* Shares DashboardBanner with the trainee and supervisor screens, so all
            three dashboards open with the same band and action strip. */}
        <DashboardBanner
          eyebrow="System Administrator Console"
          title="Hazard Hunt — Enterprise Control"
          description="Full system oversight: manage users, monitor 360° training compliance, and inspect safety vulnerability analytics across all warehouse bays."
          actions={
            <>
              {lastRefresh && (
                <span className="hidden text-[11px] text-mist-500 dark:text-dark-muted sm:block">
                  Synced {lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <button type="button" onClick={handleRefresh} title="Refresh all data" aria-label="Refresh all data"
                className="app-icon-btn">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button type="button" onClick={() => setIsCreateModalOpen(true)}
                className="app-btn app-btn-primary">
                <UserPlus className="h-3.5 w-3.5" /> Provision
              </button>
              <button type="button" onClick={handleExportCSV}
                className="app-btn app-btn-secondary hidden sm:inline-flex">
                <Download className="h-3.5 w-3.5" /> Export CSV
              </button>
            </>
          }
        />

        {/* ── Tab navigation ───────────────────────────────────────────────── */}
        {/* app-seg-scroll: 2x2 on phones so no label is clipped (Issue 3), and
            sticky just under the navbar so it stays reachable while the
            dashboard scrolls (Issue 4). */}
          <div className="app-seg app-seg-scroll mb-5">
          {tabs.map(({ id, label }) => (
            <button key={id} type="button" onClick={() => setActiveTab(id)}
              className={`app-seg-item ${activeTab === id ? 'app-seg-item-active' : ''}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="app-stack animate-fade-in">
            {/* Hero summary band */}
            <div className="app-band p-5">
              <p className="app-eyebrow-accent">Enterprise oversight</p>
              <h2 className="app-title mt-1 text-lg">Hazard Hunt — Enterprise Control</h2>
              <p className="app-body mt-1 max-w-2xl">
                Full system oversight: manage users, monitor 360° training compliance, and inspect safety vulnerability analytics across all warehouse bays.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="app-chip app-chip-brand">{users.length} Total Accounts</span>
                <span className={`app-chip ${passRate >= 75 ? 'app-chip-pass' : passRate > 0 ? 'app-chip-caution' : 'app-chip-neutral'}`}>
                  {passRate}% Pass Rate
                </span>
                <span className="app-chip app-chip-neutral">{totalAttempts} Sessions Logged</span>
              </div>
            </div>

            {/* KPI Grid */}
            <div className="app-stat-row">
              <StatTile label="Total Accounts" value={users.length}
                sub={`${adminCount} admin · ${supervisorCount} sup · ${employeeCount} emp`} />
              <StatTile label="Overall Pass Rate" value={`${passRate}%`} tone={passTone(passRate)} meter={passRate}
                sub={`${teamData?.stats?.passedCount ?? 0} of ${teamData?.stats?.attemptedCount ?? 0} trainees passed`} />
              <StatTile label="Average Score" value={`${avgScore}%`} tone={scoreTone(avgScore)} meter={avgScore}
                sub={derived ? `Median ${derived.medianScore}% · spread ${derived.scoreSpread} pts` : 'Across all official sessions'} />
              <StatTile label="Audit Sessions" value={totalAttempts}
                sub={derived ? `${derived.officialAttempts} official · ${derived.practiceAttempts} practice` : 'Official + practice combined'} />
            </div>

            {/* ── Derived analytics ────────────────────────────────────────────
                Figures a supervisor can act on, rather than restatements of the
                same counts: detection accuracy, timing percentiles, and the
                direction the cohort is actually moving in. */}
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <SectionCard
                title="Detection Accuracy"
                description="Of everything clicked, how much was a real hazard"
                bodyClass="p-4"
                actions={<span className="app-chip app-chip-brand">Derived</span>}
              >
                <Metric
                  label="Precision"
                  value={derived ? derived.detectionAccuracyPercentage : 0}
                  unit="%"
                  baseline={
                    derived
                      ? `${derived.totalSpotted} real · ${derived.totalMissed + derived.totalFalseClicks} false`
                      : undefined
                  }
                  hint={
                    derived && derived.totalFalseClicks > 0
                      ? `${derived.totalFalseClicks} false clicks recorded across all sessions.`
                      : 'No false clicks have been recorded.'
                  }
                />
              </SectionCard>

              <SectionCard
                title="Completion Time"
                description="Median and slowest-decile timings"
                bodyClass="p-4"
              >
                <div className="grid grid-cols-3 gap-3">
                  <Metric label="Median" value={mmss(derived?.medianTimeTakenSeconds ?? 0)}
                    baseline={`Mean ${mmss(analytics?.avgTimeTakenSeconds ?? 0)}`} />
                  <Metric label="Slowest 10%" value={mmss(derived?.p90TimeTakenSeconds ?? 0)}
                    baseline="90th percentile" />
                  <Metric label="Fastest" value={mmss(derived?.fastestTimeSeconds ?? 0)}
                    baseline="Best recorded" />
                </div>
              </SectionCard>

              <SectionCard
                title="Cohort Direction"
                description="Recent half of attempts vs earlier half"
                bodyClass="p-4"
                actions={<span className={`app-chip ${trendChip}`}>{trendLabel}</span>}
              >
                <Metric
                  label="Score movement"
                  value={derived ? derived.recentAvg : 0}
                  unit="%"
                  delta={trend?.deltaPoints ?? null}
                  baseline={
                    trend && trend.direction !== 'INSUFFICIENT_DATA'
                      ? `Earlier average ${trend.earlierAvg}%`
                      : 'Needs at least 2 sessions'
                  }
                />
              </SectionCard>
            </div>

            {/* Row: Scenario Card + Risk Radar */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Active Scenario */}
              <SectionCard
                title={
                  <span className="flex items-center gap-2.5">
                    <span className="app-icon-well"><Layers className="h-4 w-4" /></span>
                    <span className="min-w-0">
                      <span className="app-eyebrow block">Active training module</span>
                      <span className="app-title block">{scenario?.title || 'Bay 4: Automotive Logistics & Inbound Storage'}</span>
                    </span>
                  </span>
                }
                actions={<span className="app-chip app-chip-pass">Live</span>}
                bodyClass="p-4"
              >
                <p className="app-body">{scenario?.description}</p>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {[
                    { label: 'Code', val: scenario?.code || 'WH-BAY-04' },
                    { label: 'Duration', val: `${scenario?.timeLimitSeconds || 90}s` },
                    { label: 'Hazards', val: `${scenario?.hotspots?.length || 5}`, highlight: 'text-primary-600 dark:text-primary-400' },
                    { label: 'Pass At', val: `${scenario?.passingScorePercentage || 75}%` },
                  ].map(({ label, val, highlight }) => (
                    <div key={label} className="app-card-quiet p-2.5 text-center">
                      <p className="app-eyebrow">{label}</p>
                      <p className={`app-num mt-1 text-xs font-bold ${highlight || 'text-mist-900 dark:text-dark-text'}`}>{val}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Hazard Risk Radar */}
              <SectionCard
                title={
                  <span className="flex items-center gap-2.5">
                    <span className="app-icon-well"><AlertTriangle className="h-4 w-4" /></span>
                    Hazard Miss Rate Radar
                  </span>
                }
                description="Category vulnerability analysis"
                bodyClass="p-4"
              >
                {analytics?.categoryBreakdown?.length > 0 ? (
                  <>
                    <BarList items={radarItems} />
                    {derived?.topGapCategory && (
                      <p className="app-alert app-alert-caution mt-4">
                        <Target className="app-alert-icon" aria-hidden="true" />
                        <span>
                          <strong>Biggest gap:</strong> {derived.topGapCategory.category} — missed{' '}
                          {derived.topGapCategory.missed} time
                          {derived.topGapCategory.missed === 1 ? '' : 's'} (
                          {derived.topGapCategory.missRatePercentage}% miss rate). Prioritise this in
                          the next toolbox talk.
                        </span>
                      </p>
                    )}
                  </>
                ) : (
                  <EmptyState
                    title="No session data yet"
                    description="Analytics populate as trainees complete 360° sessions."
                  />
                )}
              </SectionCard>
            </div>

            {/* ── Weekly activity + spotted/missed balance ───────────────────── */}
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <SectionCard
                title="7-Day Activity"
                description="Sessions completed per day, with the daily average score"
                bodyClass="p-4"
              >
                {/* Plot well: the chart is recessed into the card rather than
                    floating on it, so the data reads as the panel's content. */}
                <div className="app-chart">
                  <ColumnChart
                    data={derived?.weeklyActivity ?? []}
                    valueKey="attempts"
                    formatValue={(v) => `${v} sessions`}
                  />
                </div>
                {derived?.weeklyActivity?.length > 0 && (
                  <div className="app-divider mt-4 flex flex-wrap items-center justify-between gap-2 pt-3">
                    <p className="app-body">
                      Peak day:{' '}
                      <strong className="text-mist-800 dark:text-dark-text">
                        {derived.weeklyActivity.reduce((best, d) => (d.attempts > (best?.attempts ?? -1) ? d : best), null)?.label ?? '—'}
                      </strong>
                    </p>
                    <p className="app-body">
                      {derived.practiceSharePercentage}% of all attempts are practice
                    </p>
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Spotted vs Missed"
                description="Volume behind each miss rate"
                bodyClass="p-4"
              >
                <BarList
                  items={balanceItems}
                  emptyLabel="No hazard observations recorded yet."
                />
              </SectionCard>
            </div>

            {/* Recent Users Quick View */}
            <SectionCard
              title={
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" /> Recently Provisioned ({users.length})
                </span>
              }
              actions={
                <button type="button" onClick={() => setActiveTab('users')}
                  className="app-btn app-btn-ghost app-btn-sm">
                  View All <ChevronRight className="h-3.5 w-3.5" />
                </button>
              }
              bodyClass="p-0"
            >
              <div className="app-table-wrap">
                <table className="app-table">
                  <thead>
                    <tr>
                      <th className="app-th">Name</th>
                      <th className="app-th">Username</th>
                      <th className="app-th">Role</th>
                      <th className="app-th hidden sm:table-cell">Department</th>
                      <th className="app-th hidden md:table-cell">Since</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.slice(0, 6).map(u => (
                      <tr key={u._id} className="transition-colors hover:bg-mist-50 dark:hover:bg-dark-surface">
                        <td className="app-td pl-5 font-semibold text-mist-900 dark:text-dark-text">{u.name}</td>
                        <td className="app-td app-num text-mist-500 dark:text-dark-muted">@{u.username}</td>
                        <td className="app-td">
                          <span className={`app-chip ${u.role === 'admin' ? 'app-chip-brand' : 'app-chip-neutral'}`}>{u.role}</span>
                        </td>
                        <td className="app-td hidden max-w-[140px] truncate text-mist-500 dark:text-dark-muted sm:table-cell">{u.department}</td>
                        <td className="app-num app-td hidden text-[11px] text-mist-400 dark:text-dark-muted md:table-cell">
                          {new Date(u.createdAt).toLocaleDateString('en-GB')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ── USER MANAGEMENT TAB ─────────────────────────────────────────── */}
        {activeTab === 'users' && (
          <div className="app-stack animate-fade-in">
            {/* User stats summary row */}
            <div className="grid grid-cols-3 gap-3">
              <StatTile label="Administrators" value={adminCount} />
              <StatTile label="Supervisors" value={supervisorCount} />
              <StatTile label="Employees" value={employeeCount} />
            </div>

            {/* Toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute inset-y-0 left-3.5 my-auto h-4 w-4 text-mist-400" />
                <input type="text" placeholder="Search by name, username, department…"
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="app-input pl-10" />
              </div>
              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                aria-label="Filter by role"
                className="app-input sm:w-auto">
                <option value="ALL">All Roles</option>
                <option value="admin">Admin</option>
                <option value="supervisor">Supervisor</option>
                <option value="employee">Employee</option>
              </select>
              <button type="button" onClick={() => setIsCreateModalOpen(true)}
                className="app-btn app-btn-primary whitespace-nowrap">
                <UserPlus className="h-3.5 w-3.5" /> Provision Account
              </button>
            </div>

            {/* Full User Table */}
            <SectionCard bodyClass="p-0">
              <div className="app-table-wrap">
                <table className="app-table">
                  <thead>
                    <tr>
                      <th className="app-th pl-5">Full Name</th>
                      <th className="app-th">Username</th>
                      <th className="app-th">Role</th>
                      <th className="app-th">Department</th>
                      <th className="app-th">Onboarded</th>
                      <th className="app-th">Provisioned</th>
                      <th className="app-th">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u._id} className="group transition-colors hover:bg-mist-50 dark:hover:bg-dark-surface">
                        <td className="app-td pl-5 font-semibold text-mist-900 dark:text-dark-text">{u.name}</td>
                        <td className="app-td app-num text-mist-500 dark:text-dark-muted">@{u.username}</td>
                        <td className="app-td">
                          <span className={`app-chip ${u.role === 'admin' ? 'app-chip-brand' : 'app-chip-neutral'}`}>{u.role}</span>
                        </td>
                        <td className="app-td max-w-[180px] truncate text-mist-600 dark:text-dark-muted">{u.department}</td>
                        <td className="app-td">
                          {u.hasCompletedOnboarding
                            ? <span className="app-chip app-chip-pass"><CheckCircle2 className="h-3.5 w-3.5" /> Done</span>
                            : <span className="app-chip app-chip-caution">Pending</span>}
                        </td>
                        <td className="app-num app-td text-[11px] text-mist-400 dark:text-dark-muted">
                          {new Date(u.createdAt).toLocaleDateString('en-GB')}
                        </td>
                        <td className="app-td">
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => handleViewUser(u)}
                              className="app-btn app-btn-secondary app-btn-sm">
                              View
                            </button>
                            <button type="button" onClick={() => handleDeleteUser(u._id, u.name)}
                              className="app-btn app-btn-ghost app-btn-sm hover:border-stop-600 hover:text-stop-600 dark:hover:text-stop-200">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-10 text-center">
                          <Search className="mx-auto mb-2 h-7 w-7 text-mist-400" aria-hidden="true" />
                          <p className="app-body">No accounts match your search criteria</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="app-divider flex items-center justify-between gap-3 px-5 py-3">
                <p className="app-eyebrow">
                  Showing {filteredUsers.length} of {users.length} accounts
                </p>
                <button type="button" onClick={handleRefresh}
                  className="app-btn app-btn-ghost app-btn-sm">
                  <RefreshCw className="h-3 w-3" /> Sync
                </button>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ── ANALYTICS TAB ───────────────────────────────────────────────── */}
        {activeTab === 'analytics' && (
          <div className="app-stack animate-fade-in">
            {/* Score Distribution */}
            <SectionCard
              title="Score distribution"
              description="Every logged session grouped by its final score band"
              bodyClass="p-4"
            >
              <BarList items={scoreBands} emptyLabel="No sessions logged yet" />
            </SectionCard>

            {/* Detailed Category Breakdown */}
            <SectionCard
              title="Hazard category miss rates"
              description="Sorted by vulnerability — highest miss rate first"
              bodyClass="p-4"
            >
              {analytics?.categoryBreakdown?.length > 0 ? (
                <ul className="space-y-3">
                  {analytics.categoryBreakdown.sort((a, b) => b.missRatePercentage - a.missRatePercentage).map(cat => {
                    const tone = riskTone(cat.missRatePercentage);
                    return (
                      <li key={cat.category}>
                        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-mist-700 dark:text-dark-text">{cat.category}</span>
                          <div className="flex items-center gap-2">
                            <span className="app-num text-[11px] text-mist-500 dark:text-dark-muted">
                              {cat.spotted} spotted · {cat.missed} missed
                            </span>
                            <span className={`app-chip ${riskChip(cat.missRatePercentage)}`}>
                              {cat.riskLevel} · {cat.missRatePercentage}%
                            </span>
                          </div>
                        </div>
                        <div className="app-meter">
                          <div
                            className={`app-meter-fill ${tone === 'stop' ? 'app-meter-fill-stop' : ''}`}
                            style={{ width: `${cat.missRatePercentage}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="flex flex-col items-center">
                  <EmptyState
                    title="No analytics data yet"
                    description="Analytics populate as trainees complete 360° sessions."
                  />
                </div>
              )}
            </SectionCard>

            {/* Summary stats row */}
            <div className="grid gap-4 sm:grid-cols-3">
              <StatTile label="Avg. Session Time"
                value={
                  <>
                    {analytics?.avgTimeTakenSeconds ?? 0}<span className="ml-1 text-sm font-semibold">s</span>
                  </>
                }
                sub="Time to complete inspection phase" />
              <StatTile label="Avg. False Clicks" value={analytics?.avgFalseClicksCount ?? 0}
                sub="Penalty clicks per session (avg)" />
              <StatTile label="Highest Risk Category" value={worstCategory?.category || 'N/A'}
                tone={worstCategory ? 'stop' : 'neutral'}
                sub={`${worstCategory?.missRatePercentage ?? 0}% miss rate`} />
            </div>
          </div>
        )}

        {/* ── SYSTEM STATUS TAB ───────────────────────────────────────────── */}
        {activeTab === 'system' && (
          <div className="app-stack animate-fade-in">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Server, label: 'API Server', sub: 'Node.js 20 + Express', status: true, meta: 'Port 5000 • REST API' },
                { icon: Database, label: 'Database', sub: 'MongoDB (embedded)', status: true, meta: `${users.length} accounts stored` },
                { icon: Wifi, label: 'Frontend', sub: 'React 18 + Vite', status: true, meta: 'Port 5173 • Hot Reload' },
                { icon: Shield, label: 'Auth System', sub: 'JWT Bearer Tokens', status: true, meta: '24h expiry · Role-locked' },
                { icon: HardDrive, label: 'Storage Engine', sub: 'Compliance Records', status: true, meta: `${totalAttempts} sessions stored` },
                { icon: Cpu, label: 'Session Engine', sub: '360° Pannellum Viewer', status: true, meta: 'Client-side renderer' },
              ].map(({ icon: Icon, label, sub, status, meta }) => (
                <div key={label} className="app-card p-4">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <span className="app-icon-well h-10 w-10"><Icon className="h-5 w-5" /></span>
                    <span className={`app-chip ${status ? 'app-chip-pass' : 'app-chip-stop'}`}>
                      {status ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <p className="app-title">{label}</p>
                  <p className="app-body">{sub}</p>
                  <p className="app-num mt-1.5 text-[11px] text-mist-400 dark:text-dark-muted">{meta}</p>
                </div>
              ))}
            </div>

            {/* Tech stack breakdown */}
            <SectionCard title="Technology Stack" bodyClass="p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { section: 'Frontend', items: ['React 18 + Vite (SPA)', 'Tailwind CSS v3', 'Pannellum (360° viewer)', 'Lucide Icons', 'DM Sans typography'] },
                  { section: 'Backend', items: ['Node.js 20 + Express 4', 'Mongoose v8 ODM', 'MongoDB (embedded MMS)', 'JWT Authentication', 'bcryptjs password hashing'] },
                ].map(({ section, items }) => (
                  <div key={section} className="app-card-quiet p-4">
                    <p className="app-eyebrow-accent">{section}</p>
                    <ul className="mt-2 space-y-1.5">
                      {items.map(item => (
                        <li key={item} className="flex items-center gap-2 text-xs text-mist-700 dark:text-dark-muted">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-pass-600 dark:text-pass-200" aria-hidden="true" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Security Controls" bodyClass="p-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  'Role-locked login portals (employee/supervisor/admin tabs)',
                  'Server-side role verification on every protected endpoint',
                  'Supervisors can only create Employee accounts (never Supervisor/Admin)',
                  'Compliance scores calculated server-side (tamper-proof)',
                  'JWT tokens expire in 24 hours (auto re-auth)',
                  'Passwords hashed with bcrypt (salt rounds: 12)',
                ].map(item => (
                  <div key={item} className="flex items-start gap-2 text-xs text-mist-700 dark:text-dark-muted">
                    <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mist-400" aria-hidden="true" />
                    {item}
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        )}
      </div>

      <UserAuditModal
        user={selectedUser}
        audit={selectedUserAudit}
        loading={userAuditLoading}
        onClose={() => { setSelectedUser(null); setSelectedUserAudit(null); }}
        onDownload={handleDownloadUserReport}
      />

      {/* ── CREATE USER MODAL ─────────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-mist-950/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="app-card w-full max-w-md overflow-hidden shadow-pop animate-slide-up">
            <div className="app-card-head">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="app-icon-well"><UserPlus className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <h3 className="app-title">Provision New Account</h3>
                  <p className="app-body mt-0.5">Admin can create Supervisor or Employee accounts</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsCreateModalOpen(false)}
                className="app-icon-btn" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* app-form-stack: one field per full-width row on phones, each label above
                its own input (Issue 5). From 640px up it returns to the
                two-column layout, which suits a larger screen. */}
            <form onSubmit={handleCreateUser} className="app-form-stack space-y-4 p-5">
              <div>
                <label className="app-label">Full Name *</label>
                <input type="text" required placeholder="e.g. David Ross" value={newName} onChange={e => setNewName(e.target.value)}
                  className="app-input" />
              </div>
              <div>
                <label className="app-label">Username *</label>
                <input type="text" required placeholder="e.g. supervisor2" value={newUsername} onChange={e => setNewUsername(e.target.value)}
                  className="app-input" />
              </div>
              <div>
                <label className="app-label">Password *</label>
                <input type="password" required placeholder="Min. 6 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  className="app-input" />
              </div>
              <div className="app-form-pair">
                <div>
                  <label className="app-label">Role</label>
                  <select value={newRole} onChange={e => setNewRole(e.target.value)} className="app-input">
                    <option value="supervisor">Supervisor (HSE)</option>
                    <option value="employee">Employee (Trainee)</option>
                  </select>
                </div>
                <div>
                  <label className="app-label">Department</label>
                  <input type="text" value={newDept} onChange={e => setNewDept(e.target.value)} className="app-input" />
                </div>
              </div>
              <div className="app-alert app-alert-brand">
                <Lock className="app-alert-icon" aria-hidden="true" />
                <span>Admin can provision both Supervisors and Employees. Supervisors may only provision Employees.</span>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsCreateModalOpen(false)}
                  className="app-btn app-btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={isCreating} className="app-btn app-btn-primary flex-1">
                  {isCreating
                    ? <><span className="app-spinner" /> Provisioning…</>
                    : <><CheckCircle2 className="h-3.5 w-3.5" /> Provision Account</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(userPendingDelete)}
        title="Delete User Account"
        message={`Are you sure you want to delete ${userPendingDelete?.name || 'this user'}? The login is removed permanently. Any compliance records already filed are kept as audit evidence, so they still appear in exports after the account is gone.`}
        confirmText="Delete User"
        cancelText="Keep User"
        isDestructive
        onConfirm={confirmDeleteUser}
        onCancel={() => setUserPendingDelete(null)}
      />
    </div>
  );
};
