import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ConfirmModal } from '../common/ConfirmModal';
import { UserAuditModal } from '../common/UserAuditModal';
import { soundEngine } from '../../utils/audio';
import {
  Users, Award, CheckCircle2, XCircle, Clock, Download, UserPlus,
  Search, RefreshCw, ShieldCheck, AlertCircle, BarChart3,
  TrendingUp, TrendingDown, ChevronRight, X, FileText, Target, Sparkles,
  AlertTriangle, Activity, Filter, Eye, ChevronDown, LogOut, Moon, Sun,
  LayoutDashboard, LineChart, UserCheck, ArrowUpRight, ArrowDownRight,
  Building2, Timer, Zap, Lock, Shield, Trash2
} from 'lucide-react';

// ── Animated Score Ring (CSS) ────────────────────────────────────────────────
const ScoreRing = ({ score, size = 80, strokeWidth = 7, color = '#FF6115' }) => {
  const r = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = ((100 - score) / 100) * circumference;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor"
        strokeWidth={strokeWidth} className="text-mist-200 dark:text-dark-surface" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
        strokeWidth={strokeWidth} strokeDasharray={circumference}
        strokeDashoffset={progress} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }} />
    </svg>
  );
};

// ── Status Chip ──────────────────────────────────────────────────────────────
const StatusChip = ({ status }) => {
  const styles = {
    PASS: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    FAIL: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 border-red-200 dark:border-red-800',
    PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  };
  const icons = { PASS: CheckCircle2, FAIL: XCircle, PENDING: Clock };
  const StatusIcon = icons[status] || Clock;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles[status] || styles.PENDING}`}>
      <StatusIcon className="w-3 h-3" /> {status}
    </span>
  );
};

// ── Compact progress bar ─────────────────────────────────────────────────────
const ProgressBar = ({ value, color = 'bg-primary-500', showLabel = true }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 h-2 bg-mist-100 dark:bg-dark-surface rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
    {showLabel && <span className="text-[10px] font-bold text-mist-500 dark:text-dark-muted w-8 text-right">{value}%</span>}
  </div>
);

// ── KPI stat card ────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, trend }) => (
  <div className="app-card relative flex min-h-[126px] flex-col p-5 transition-all duration-200 hover:border-primary-300 dark:hover:border-primary-700">
    {trend !== undefined && (
      <div className={`absolute right-5 top-5 flex items-center gap-0.5 text-[11px] font-bold ${trend >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
        {trend >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
        {Math.abs(trend)}%
      </div>
    )}
    <p className="min-h-[16px] text-[10px] font-bold uppercase tracking-wider text-mist-500 dark:text-dark-muted">{label}</p>
    <p className="mt-2 text-2xl font-black leading-none text-mist-900 dark:text-white">{value}</p>
    <p className="mt-auto min-h-[16px] text-[11px] text-mist-400 dark:text-dark-muted">{sub || '\u00A0'}</p>
  </div>
);

export const SupervisorDashboard = () => {
  const { showToast } = useToast();
  const { logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

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

  // Logout confirm
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
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

  const tabs = [
    { id: 'dashboard', label: 'Team Dashboard', icon: LayoutDashboard },
    { id: 'trainees', label: 'Trainee Records', icon: Users },
    { id: 'analytics', label: 'Risk Analytics', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-mist-200 dark:bg-dark-bg">

      {/* Supervisor Header */}
      <div className="bg-white dark:bg-dark-card border-b border-mist-300 dark:border-dark-border sticky top-0 z-40 shadow-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-black text-mist-900 dark:text-white tracking-tight">HSE SUPERVISOR</p>
                <p className="text-[10px] text-mist-500 dark:text-dark-muted">Health, Safety & Environment Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {lastRefresh && (
                <span className="hidden sm:block text-[10px] text-mist-500 dark:text-dark-muted">
                  Synced {lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <button onClick={handleRefresh}
                className="p-2 rounded-xl hover:bg-mist-100 dark:hover:bg-dark-surface text-mist-600 dark:text-dark-muted transition-colors">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary-500' : ''}`} />
              </button>
              <button onClick={toggleTheme}
                className="p-2 rounded-xl hover:bg-mist-100 dark:hover:bg-dark-surface text-mist-600 dark:text-dark-muted transition-colors">
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>
              <button onClick={handleExportCSV}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-mist-100 dark:bg-dark-surface text-mist-800 dark:text-white text-xs font-semibold border border-mist-300 dark:border-dark-border hover:border-primary-500/40 transition-colors">
                <Download className="w-3.5 h-3.5 text-primary-500" /> Export CSV
              </button>
              <button onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold shadow-sm transition-all">
                <UserPlus className="w-3.5 h-3.5" /> Add Trainee
              </button>
              <button onClick={() => setShowLogoutConfirm(true)}
                className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-mist-500 dark:text-dark-muted hover:text-red-600 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tab nav */}
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                  activeTab === id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-mist-500 dark:text-dark-muted hover:text-mist-800 dark:hover:text-white'
                }`}>
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ── DASHBOARD TAB ────────────────────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">

            {/* Hero section */}
            <div className="bg-primary-600 rounded-xl p-6 text-white shadow-sm relative overflow-hidden">
              <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-primary-100 text-xs font-semibold uppercase tracking-widest mb-1">Real-Time Team Compliance Monitor</p>
                  <h1 className="text-2xl font-black tracking-tight mb-2">HSE Supervisor Dashboard</h1>
                  <p className="text-primary-100 text-sm max-w-lg">
                    Monitor your team's 360° hazard training sessions, track compliance status, and identify risk patterns in real time.
                  </p>
                </div>
                <div className="flex-shrink-0 flex items-center justify-center w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm">
                  <div className="relative">
                    <ScoreRing score={stats.passRatePercentage || 0} size={72} strokeWidth={6} color="#ffffff" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-black">{stats.passRatePercentage || 0}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Total Trainees" value={stats.totalEmployees ?? 0}
                sub="Registered employees"
                iconClass="bg-mist-100 dark:bg-dark-surface text-mist-600 dark:text-dark-muted" />
              <StatCard icon={CheckCircle2} label="Passed" value={stats.passedCount ?? 0}
                sub={`${stats.passRatePercentage ?? 0}% pass rate`}
                iconClass="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                trend={(stats.passRatePercentage || 0) >= 75 ? 5 : -8} />
              <StatCard icon={XCircle} label="Failed / Pending" value={(stats.failedCount ?? 0) + (stats.pendingCount ?? 0)}
                sub={`${stats.failedCount ?? 0} failed · ${stats.pendingCount ?? 0} pending`}
                iconClass="bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400" />
              <StatCard icon={Award} label="Avg. Score" value={`${stats.averageScorePercentage ?? 0}%`}
                sub="Official sessions only"
                iconClass="bg-primary-100 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400" />
            </div>

            {/* Compliance progress bar display */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-card dark:shadow-card-dark border border-mist-300 dark:border-dark-border p-5">
              <h3 className="text-sm font-bold text-mist-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500" /> Team Compliance Breakdown
              </h3>
              <div className="space-y-4">
                {[
                  { label: 'Passed', value: stats.passedCount ?? 0, total: stats.totalEmployees || 1, color: 'bg-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400' },
                  { label: 'Failed', value: stats.failedCount ?? 0, total: stats.totalEmployees || 1, color: 'bg-red-500', textColor: 'text-red-600 dark:text-red-400' },
                  { label: 'Pending (Not Attempted)', value: stats.pendingCount ?? 0, total: stats.totalEmployees || 1, color: 'bg-amber-500', textColor: 'text-amber-600 dark:text-amber-400' },
                ].map(({ label, value, total, color, textColor }) => {
                  const pct = Math.round((value / total) * 100);
                  return (
                    <div key={label}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-semibold text-mist-700 dark:text-dark-muted">{label}</span>
                        <span className={`text-xs font-bold ${textColor}`}>{value} employees ({pct}%)</span>
                      </div>
                      <ProgressBar value={pct} color={color} showLabel={false} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick trainee preview */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-card dark:shadow-card-dark border border-mist-300 dark:border-dark-border overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-mist-200 dark:border-dark-border bg-mist-50/50 dark:bg-dark-surface/30">
                <h3 className="text-sm font-bold text-mist-900 dark:text-white flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500" /> Recent Trainee Activity
                </h3>
                <button onClick={() => setActiveTab('trainees')}
                  className="text-xs text-primary-500 hover:text-primary-700 font-semibold flex items-center gap-0.5">
                  View All <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="divide-y divide-mist-100 dark:divide-dark-border">
                {team.slice(0, 5).map(e => (
                  <div key={e.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-mist-50/50 dark:hover:bg-dark-surface/20 transition-colors cursor-pointer group"
                    onClick={() => handleInspectTrainee(e)}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-primary-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {e.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-mist-900 dark:text-white truncate">{e.name}</p>
                        <p className="text-[10px] text-mist-500 dark:text-dark-muted truncate">{e.department}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <StatusChip status={e.status} />
                      {e.latestScore !== null && (
                        <span className="text-xs font-bold text-mist-700 dark:text-white hidden sm:block">{e.latestScore}%</span>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-mist-400 group-hover:text-primary-500 transition-colors" />
                    </div>
                  </div>
                ))}
                {team.length === 0 && !loading && (
                  <div className="py-12 text-center text-mist-400 dark:text-dark-muted">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">No trainee accounts yet. Add employees using the button above.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── TRAINEES TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'trainees' && (
          <div className="space-y-5 animate-fade-in">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-mist-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input type="text" placeholder="Search trainees by name, username, department…"
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-mist-300 dark:border-dark-border bg-white dark:bg-dark-card text-mist-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all" />
              </div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="px-3.5 py-2.5 text-xs rounded-xl border border-mist-300 dark:border-dark-border bg-white dark:bg-dark-card text-mist-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/40">
                <option value="ALL">All Statuses</option>
                <option value="PASS">Passed</option>
                <option value="FAIL">Failed</option>
                <option value="PENDING">Pending</option>
              </select>
              <button onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold shadow-sm transition-all whitespace-nowrap">
                <UserPlus className="w-3.5 h-3.5" /> New Employee
              </button>
              <button onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-mist-100 dark:bg-dark-surface text-mist-800 dark:text-white text-xs font-semibold border border-mist-300 dark:border-dark-border hover:border-primary-500/40 transition-colors whitespace-nowrap">
                <Download className="w-3.5 h-3.5 text-primary-500" /> Export CSV
              </button>
            </div>

            {/* Trainee data table */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-card dark:shadow-card-dark border border-mist-300 dark:border-dark-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-mist-500 dark:text-dark-muted bg-mist-50 dark:bg-dark-surface/50 border-b border-mist-200 dark:border-dark-border">
                      <th className="py-3 px-5 font-bold">Trainee</th>
                      <th className="py-3 px-4 font-bold">Status</th>
                      <th className="py-3 px-4 font-bold hidden sm:table-cell">Score</th>
                      <th className="py-3 px-4 font-bold hidden md:table-cell">Hazards Found</th>
                      <th className="py-3 px-4 font-bold hidden lg:table-cell">Sessions</th>
                      <th className="py-3 px-4 font-bold hidden lg:table-cell">Last Attempt</th>
                      <th className="py-3 px-4 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mist-100 dark:divide-dark-border text-xs">
                    {filteredTeam.map(e => (
                      <tr key={e.id} className="hover:bg-primary-50/30 dark:hover:bg-primary-950/10 transition-colors group">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-primary-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                              {e.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-mist-900 dark:text-white">{e.name}</p>
                              <p className="text-[10px] text-mist-500 dark:text-dark-muted">@{e.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4"><StatusChip status={e.status} /></td>
                        <td className="py-3.5 px-4 hidden sm:table-cell">
                          {e.latestScore !== null ? (
                            <div className="flex items-center gap-2 max-w-[100px]">
                              <span className="font-bold text-mist-900 dark:text-white">{e.latestScore}%</span>
                              <div className="flex-1 h-1.5 bg-mist-100 dark:bg-dark-surface rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${e.status === 'PASS' ? 'bg-emerald-500' : 'bg-red-500'}`}
                                  style={{ width: `${e.latestScore}%` }} />
                              </div>
                            </div>
                          ) : <span className="text-mist-400">—</span>}
                        </td>
                        <td className="py-3.5 px-4 hidden md:table-cell">
                          {e.hasAttempted ? (
                            <span className="text-mist-700 dark:text-dark-muted">
                              {e.hazardsFoundCount}/{e.hazardsFoundCount + e.hazardsMissedCount}
                            </span>
                          ) : <span className="text-mist-400">—</span>}
                        </td>
                        <td className="py-3.5 px-4 hidden lg:table-cell font-mono text-mist-500 dark:text-dark-muted">
                          {e.totalAttempts}
                        </td>
                        <td className="py-3.5 px-4 hidden lg:table-cell font-mono text-mist-400 dark:text-dark-muted text-[11px]">
                          {e.lastAttemptDate ? new Date(e.lastAttemptDate).toLocaleDateString('en-GB') : '—'}
                        </td>
                        <td className="py-3.5 px-4 flex gap-2 items-center">
                          <button onClick={() => handleInspectTrainee(e)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-mist-100 dark:bg-dark-surface hover:bg-primary-50 dark:hover:bg-primary-950/40 text-mist-600 dark:text-dark-muted hover:text-primary-700 dark:hover:text-primary-300 text-[10px] font-bold transition-colors group-hover:border-primary-200">
                            <Eye className="w-3 h-3" /> View
                          </button>
                          <button onClick={(event) => { event.stopPropagation(); handleDeleteUser(e.id, e.name); }}
                            className="p-1.5 rounded-lg text-mist-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            title="Delete Trainee">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredTeam.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-mist-400 dark:text-dark-muted">
                          <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No trainees match your filters</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-mist-100 dark:border-dark-border bg-mist-50/30 dark:bg-dark-surface/20">
                <p className="text-[11px] text-mist-500 dark:text-dark-muted">
                  {filteredTeam.length} of {team.length} trainees · {stats.passedCount ?? 0} passed · {stats.failedCount ?? 0} failed · {stats.pendingCount ?? 0} pending
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── ANALYTICS TAB ────────────────────────────────────────────────── */}
        {activeTab === 'analytics' && (
          <div className="space-y-5 animate-fade-in">
            {/* Summary row */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="app-card p-5">
                <p className="text-[11px] uppercase font-bold tracking-wider text-mist-500 dark:text-dark-muted mb-1">Total Audit Sessions</p>
                <p className="text-2xl font-black text-mist-900 dark:text-white">{analytics?.totalAudits ?? 0}</p>
                <p className="text-[11px] text-mist-400 mt-1">Official + practice combined</p>
              </div>
              <div className="app-card p-5">
                <p className="text-[11px] uppercase font-bold tracking-wider text-mist-500 dark:text-dark-muted mb-1">Avg. Session Time</p>
                <p className="text-2xl font-black text-mist-900 dark:text-white">
                  {analytics?.avgTimeTakenSeconds ?? 0}<span className="text-base font-medium ml-1">sec</span>
                </p>
                <p className="text-[11px] text-mist-400 mt-1">Time to complete 360° inspection</p>
              </div>
              <div className="app-card p-5">
                <p className="text-[11px] uppercase font-bold tracking-wider text-mist-500 dark:text-dark-muted mb-1">Avg. False Clicks</p>
                <p className="text-2xl font-black text-mist-900 dark:text-white">{analytics?.avgFalseClicksCount ?? 0}</p>
                <p className="text-[11px] text-mist-400 mt-1">Penalty clicks per session (avg)</p>
              </div>
            </div>

            {/* Category miss rate analysis */}
            <div className="app-card p-5">
              <div className="mb-5">
                <p className="text-[11px] uppercase font-bold tracking-wider text-primary-500">Safety analytics</p>
                <h3 className="text-sm font-bold text-mist-900 dark:text-white mt-1">Hazard category vulnerability</h3>
              </div>
              {analytics?.categoryBreakdown?.length > 0 ? (
                <div className="space-y-5">
                  {analytics.categoryBreakdown.sort((a, b) => b.missRatePercentage - a.missRatePercentage).map(cat => (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            cat.riskLevel === 'CRITICAL' ? 'bg-red-500' :
                            cat.riskLevel === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} />
                          <span className="text-xs font-semibold text-mist-800 dark:text-white">{cat.category}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-[10px] text-mist-500 dark:text-dark-muted hidden sm:block">
                            {cat.spotted} spotted · {cat.missed} missed
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            cat.riskLevel === 'CRITICAL' ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400' :
                            cat.riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' :
                            'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                          }`}>{cat.riskLevel} · {cat.missRatePercentage}%</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-mist-100 dark:bg-dark-surface rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${
                          cat.riskLevel === 'CRITICAL' ? 'bg-red-500' :
                          cat.riskLevel === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} style={{ width: `${cat.missRatePercentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-mist-400 dark:text-dark-muted">
                  <p className="text-sm">Analytics data will populate once trainees complete sessions.</p>
                </div>
              )}
            </div>

            {/* Score distribution */}
            <div className="app-card p-5">
              <h3 className="text-sm font-bold text-mist-900 dark:text-white mb-4">
                Score distribution
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Distinction', range: '90–100%', value: analytics?.scoreDistribution?.distDistinction ?? 0, color: 'bg-primary-500', bg: 'bg-primary-50 dark:bg-primary-950/30 border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300' },
                  { label: 'Pass', range: '75–89%', value: analytics?.scoreDistribution?.distPass ?? 0, color: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' },
                  { label: 'Near-Miss', range: '60–74%', value: analytics?.scoreDistribution?.distNearMiss ?? 0, color: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300' },
                  { label: 'Fail', range: '<60%', value: analytics?.scoreDistribution?.distFail ?? 0, color: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300' },
                ].map(({ label, range, value, color, bg }) => (
                  <div key={label} className={`rounded-2xl p-4 border ${bg} text-center`}>
                    <p className="text-2xl font-black">{value}</p>
                    <p className="text-[11px] font-bold mt-1">{label}</p>
                    <p className="text-[10px] opacity-60 mt-0.5">{range}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <UserAuditModal
        user={selectedTrainee}
        audit={auditDetails}
        loading={auditLoading}
        onClose={() => { setSelectedTrainee(null); setAuditDetails(null); }}
        onDownload={() => api.downloadScoreReport(auditDetails?.records || [], selectedTrainee)}
      />

      {/* ── CREATE EMPLOYEE MODAL ─────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-dark-card rounded-3xl shadow-2xl max-w-md w-full border border-mist-300 dark:border-dark-border overflow-hidden animate-slide-up">
            <div className="bg-primary-600 p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <UserPlus className="w-5 h-5" />
                  <h3 className="text-base font-bold">Create Employee Account</h3>
                </div>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-primary-100 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-primary-100 text-xs mt-1">Supervisors may create Employee (Trainee) accounts only</p>
            </div>
            <form onSubmit={handleCreateEmployee} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-mist-700 dark:text-dark-muted mb-1.5">Full Name *</label>
                  <input type="text" required placeholder="e.g. James Walker" value={newName} onChange={e => setNewName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-mist-300 dark:border-dark-border bg-mist-50 dark:bg-dark-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-mist-700 dark:text-dark-muted mb-1.5">Username *</label>
                  <input type="text" required placeholder="e.g. trainee5" value={newUsername} onChange={e => setNewUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-mist-300 dark:border-dark-border bg-mist-50 dark:bg-dark-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-mist-700 dark:text-dark-muted mb-1.5">Password *</label>
                  <input type="password" required placeholder="Min. 6 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-mist-300 dark:border-dark-border bg-mist-50 dark:bg-dark-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-mist-700 dark:text-dark-muted mb-1.5">Department</label>
                  <input type="text" value={newDept} onChange={e => setNewDept(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-mist-300 dark:border-dark-border bg-mist-50 dark:bg-dark-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/40" />
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-3">
                <p className="text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                  <Shield className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>Supervisors are restricted to provisioning Employee (Trainee) accounts only. Contact your System Administrator to create Supervisor accounts.</span>
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-mist-100 dark:bg-dark-surface text-mist-700 dark:text-dark-muted hover:bg-mist-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isCreating}
                  className="flex-1 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {isCreating ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating…</> : <><CheckCircle2 className="w-3.5 h-3.5" /> Create Employee</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Sign Out of Supervisor Dashboard?"
        message="You'll need to re-authenticate to access the HSE Supervisor dashboard."
        confirmText="Sign Out"
        cancelText="Stay Signed In"
        isDestructive
        onConfirm={() => { logout(); setShowLogoutConfirm(false); }}
        onCancel={() => setShowLogoutConfirm(false)}
      />

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
