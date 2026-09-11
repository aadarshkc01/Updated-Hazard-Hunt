import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { soundEngine } from '../../utils/audio';
import {
  KeyRound, Server, Database, Layers, Sparkles, Eye, UserPlus, Users,
  ShieldAlert, Search, CheckCircle2, RefreshCw, Lock, X, Trash2,
  TrendingUp, Activity, BarChart3, Shield, Clock, AlertTriangle,
  Target, Award, ArrowUpRight, ArrowDownRight, ChevronRight, 
  Building2, Cpu, Wifi, HardDrive, LogOut, Moon, Sun, Settings,
  LayoutDashboard, FileText, Download
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

// ── Mini bar chart (CSS only, no external lib) ──────────────────────────────
const MiniBar = ({ value, max, color = 'bg-violet-500' }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-mist-200 dark:bg-dark-surface rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-bold text-mist-600 dark:text-dark-muted w-8 text-right">
        {pct}%
      </span>
    </div>
  );
};

// ── KPI Stat Card ────────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, sub, color, trend }) => (
  <div className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-card dark:shadow-card-dark border border-mist-300 dark:border-dark-border flex items-start gap-4 hover:shadow-violet/10 hover:-translate-y-0.5 transition-all duration-200">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon className="w-6 h-6" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-widest text-mist-500 dark:text-dark-muted mb-0.5">{label}</p>
      <p className="text-2xl font-black text-mist-900 dark:text-white leading-none">{value}</p>
      {sub && <p className="text-[11px] text-mist-500 dark:text-dark-muted mt-1">{sub}</p>}
    </div>
    {trend !== undefined && (
      <div className={`flex items-center gap-0.5 text-[11px] font-bold ${trend >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
        {trend >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
        {Math.abs(trend)}%
      </div>
    )}
  </div>
);

// ── System health indicator ──────────────────────────────────────────────────
const HealthDot = ({ online = true, label }) => (
  <div className="flex items-center gap-2">
    <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
    <span className="text-xs text-mist-600 dark:text-dark-muted">{label}</span>
    <span className={`text-[10px] font-bold ${online ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
      {online ? 'ONLINE' : 'OFFLINE'}
    </span>
  </div>
);

// ── Role badge ───────────────────────────────────────────────────────────────
const RoleBadge = ({ role }) => {
  const styles = {
    admin: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    supervisor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    employee: 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${styles[role] || styles.employee}`}>
      {role}
    </span>
  );
};

export const AdminDashboard = ({ onLaunchTrainer }) => {
  const { showToast } = useToast();
  const { logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

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

  // Logout confirm modal
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
      showToast(`✓ Account provisioned: ${newName} as ${newRole.toUpperCase()}`, 'success');
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

  const filteredUsers = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.department.toLowerCase().includes(searchTerm.toLowerCase());
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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'analytics', label: 'Safety Analytics', icon: BarChart3 },
    { id: 'system', label: 'System Status', icon: Server },
  ];

  return (
    <div className="min-h-screen bg-mist-200 dark:bg-dark-bg">
      {/* Top Admin Header Bar */}
      <div className="bg-white dark:bg-dark-card border-b border-mist-300 dark:border-dark-border sticky top-0 z-40 shadow-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-violet-500 flex items-center justify-center">
                <KeyRound className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-black text-mist-900 dark:text-white tracking-tight">ADMIN CONSOLE</p>
                <p className="text-[10px] text-mist-500 dark:text-dark-muted">System Administrator Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {lastRefresh && (
                <span className="hidden sm:block text-[10px] text-mist-500 dark:text-dark-muted">
                  Synced {lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <button onClick={handleRefresh} title="Refresh all data"
                className="p-2 rounded-xl hover:bg-mist-100 dark:hover:bg-dark-surface text-mist-600 dark:text-dark-muted transition-colors">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-violet-500' : ''}`} />
              </button>
              <button onClick={toggleTheme}
                className="p-2 rounded-xl hover:bg-mist-100 dark:hover:bg-dark-surface text-mist-600 dark:text-dark-muted transition-colors">
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>
              <button onClick={onLaunchTrainer}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-mist-100 dark:bg-dark-surface hover:bg-violet-50 dark:hover:bg-violet-950/40 text-mist-800 dark:text-white text-xs font-semibold border border-mist-300 dark:border-dark-border transition-colors">
                <Eye className="w-3.5 h-3.5 text-violet-500" /> View 360°
              </button>
              <button onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-xs font-bold shadow-violet transition-all">
                <UserPlus className="w-3.5 h-3.5" /> Provision
              </button>
              <button onClick={() => setShowLogoutConfirm(true)}
                className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-mist-500 dark:text-dark-muted hover:text-red-600 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 pb-0 -mb-px overflow-x-auto">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                  activeTab === id
                    ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                    : 'border-transparent text-mist-500 dark:text-dark-muted hover:text-mist-800 dark:hover:text-white'
                }`}>
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ── OVERVIEW TAB ────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            {/* Hero greeting */}
            <div className="bg-gradient-to-r from-violet-600 via-violet-500 to-purple-600 rounded-3xl p-6 text-white shadow-violet-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptMCAwdi02aC02djZoNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
              <div className="relative">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-violet-200 text-xs font-semibold uppercase tracking-widest mb-1">System Administrator Console</p>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">Hazard Hunt — Enterprise Control</h1>
                    <p className="text-violet-200 text-sm max-w-xl">
                      Full system oversight: manage users, monitor 360° training compliance, and inspect safety vulnerability analytics across all warehouse bays.
                    </p>
                  </div>
                  <ShieldAlert className="w-12 h-12 text-violet-300 flex-shrink-0 hidden sm:block" />
                </div>
                <div className="flex flex-wrap gap-3 mt-4">
                  <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 text-sm font-bold">
                    {users.length} Total Accounts
                  </div>
                  <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 text-sm font-bold">
                    {passRate}% Pass Rate
                  </div>
                  <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 text-sm font-bold">
                    {totalAttempts} Sessions Logged
                  </div>
                </div>
              </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard icon={Users} label="Total Accounts" value={users.length}
                sub={`${adminCount} admin · ${supervisorCount} sup · ${employeeCount} emp`}
                color="bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400" />
              <KpiCard icon={TrendingUp} label="Overall Pass Rate" value={`${passRate}%`}
                sub={`${teamData?.stats?.passedCount ?? 0} of ${teamData?.stats?.attemptedCount ?? 0} trainees passed`}
                color="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                trend={passRate >= 75 ? 8 : -12} />
              <KpiCard icon={Award} label="Average Score" value={`${avgScore}%`}
                sub="Across all official sessions"
                color="bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400" />
              <KpiCard icon={Activity} label="Audit Sessions" value={totalAttempts}
                sub="Official + practice combined"
                color="bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400" />
            </div>

            {/* Row: Scenario Card + Risk Radar */}
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Active Scenario */}
              <div className="bg-white dark:bg-dark-card rounded-2xl shadow-card dark:shadow-card-dark border border-mist-300 dark:border-dark-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase font-bold tracking-wider text-violet-500">Active Training Module</p>
                      <h3 className="text-sm font-bold text-mist-900 dark:text-white">
                        {scenario?.title || 'Bay 4: Automotive Logistics & Inbound Storage'}
                      </h3>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
                  </span>
                </div>
                <p className="text-xs text-mist-600 dark:text-dark-muted mb-4 leading-relaxed">{scenario?.description}</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Code', val: scenario?.code || 'WH-BAY-04', mono: true },
                    { label: 'Duration', val: `${scenario?.timeLimitSeconds || 90}s` },
                    { label: 'Hazards', val: `${scenario?.hotspots?.length || 5}`, highlight: 'text-emerald-600 dark:text-emerald-400' },
                    { label: 'Pass At', val: `${scenario?.passingScorePercentage || 75}%` },
                  ].map(({ label, val, mono, highlight }) => (
                    <div key={label} className="bg-mist-100 dark:bg-dark-surface rounded-xl p-2.5 text-center">
                      <p className="text-[10px] text-mist-500 dark:text-dark-muted">{label}</p>
                      <p className={`text-xs font-bold mt-0.5 ${highlight || 'text-mist-900 dark:text-white'} ${mono ? 'font-mono' : ''}`}>{val}</p>
                    </div>
                  ))}
                </div>
                <button onClick={onLaunchTrainer}
                  className="mt-4 w-full py-2 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-violet">
                  <Eye className="w-3.5 h-3.5" /> Launch 360° Trainer Preview
                </button>
              </div>

              {/* Hazard Risk Radar */}
              <div className="bg-white dark:bg-dark-card rounded-2xl shadow-card dark:shadow-card-dark border border-mist-300 dark:border-dark-border p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase font-bold tracking-wider text-red-500">Hazard Miss Rate Radar</p>
                    <p className="text-sm font-bold text-mist-900 dark:text-white">Category Vulnerability Analysis</p>
                  </div>
                </div>
                {analytics?.categoryBreakdown?.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.categoryBreakdown.map((cat) => (
                      <div key={cat.category}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[11px] font-semibold text-mist-700 dark:text-dark-muted truncate flex-1 mr-2">{cat.category}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            cat.riskLevel === 'CRITICAL' ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400' :
                            cat.riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' :
                            'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                          }`}>{cat.riskLevel}</span>
                        </div>
                        <MiniBar value={cat.missRatePercentage} max={100}
                          color={cat.riskLevel === 'CRITICAL' ? 'bg-red-500' : cat.riskLevel === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-mist-400 dark:text-dark-muted">
                    <Activity className="w-8 h-8 mb-2 opacity-40" />
                    <p className="text-xs text-center">No session data yet.<br/>Analytics populate as trainees complete sessions.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Users Quick View */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-card dark:shadow-card-dark border border-mist-300 dark:border-dark-border overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-mist-200 dark:border-dark-border bg-mist-50/50 dark:bg-dark-surface/30">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-violet-500" />
                  <h3 className="text-sm font-bold text-mist-900 dark:text-white">Recently Provisioned ({users.length})</h3>
                </div>
                <button onClick={() => setActiveTab('users')}
                  className="text-xs text-violet-500 hover:text-violet-700 font-semibold flex items-center gap-0.5">
                  View All <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-mist-500 dark:text-dark-muted bg-mist-50 dark:bg-dark-surface/20 border-b border-mist-200 dark:border-dark-border">
                      <th className="py-2.5 px-5 font-bold">Name</th>
                      <th className="py-2.5 px-4 font-bold">Username</th>
                      <th className="py-2.5 px-4 font-bold">Role</th>
                      <th className="py-2.5 px-4 font-bold hidden sm:table-cell">Department</th>
                      <th className="py-2.5 px-4 font-bold hidden md:table-cell">Since</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mist-100 dark:divide-dark-border text-xs">
                    {users.slice(0, 6).map(u => (
                      <tr key={u._id} className="hover:bg-violet-50/30 dark:hover:bg-violet-950/10 transition-colors">
                        <td className="py-3 px-5 font-semibold text-mist-900 dark:text-white">{u.name}</td>
                        <td className="py-3 px-4 font-mono text-mist-500 dark:text-dark-muted">@{u.username}</td>
                        <td className="py-3 px-4"><RoleBadge role={u.role} /></td>
                        <td className="py-3 px-4 text-mist-500 dark:text-dark-muted hidden sm:table-cell truncate max-w-[140px]">{u.department}</td>
                        <td className="py-3 px-4 text-mist-400 dark:text-dark-muted font-mono text-[11px] hidden md:table-cell">
                          {new Date(u.createdAt).toLocaleDateString('en-GB')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── USER MANAGEMENT TAB ─────────────────────────────────────────── */}
        {activeTab === 'users' && (
          <div className="space-y-5 animate-fade-in">
            {/* User stats summary row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Administrators', count: adminCount, color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800' },
                { label: 'Supervisors', count: supervisorCount, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800' },
                { label: 'Employees', count: employeeCount, color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800' },
              ].map(({ label, count, color }) => (
                <div key={label} className={`rounded-2xl p-4 border text-center ${color} shadow-sm`}>
                  <p className="text-2xl font-black">{count}</p>
                  <p className="text-[11px] font-bold mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-mist-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input type="text" placeholder="Search by name, username, department…"
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-mist-300 dark:border-dark-border bg-white dark:bg-dark-card text-mist-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all" />
              </div>
              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                className="px-3.5 py-2.5 text-xs rounded-xl border border-mist-300 dark:border-dark-border bg-white dark:bg-dark-card text-mist-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40">
                <option value="ALL">All Roles</option>
                <option value="admin">Admin</option>
                <option value="supervisor">Supervisor</option>
                <option value="employee">Employee</option>
              </select>
              <button onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-xs font-bold shadow-violet transition-all whitespace-nowrap">
                <UserPlus className="w-3.5 h-3.5" /> Provision Account
              </button>
            </div>

            {/* Full User Table */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-card dark:shadow-card-dark border border-mist-300 dark:border-dark-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-mist-500 dark:text-dark-muted bg-mist-50 dark:bg-dark-surface/50 border-b border-mist-200 dark:border-dark-border">
                      <th className="py-3 px-5 font-bold">Full Name</th>
                      <th className="py-3 px-4 font-bold">Username</th>
                      <th className="py-3 px-4 font-bold">Role</th>
                      <th className="py-3 px-4 font-bold">Department</th>
                      <th className="py-3 px-4 font-bold">Onboarded</th>
                      <th className="py-3 px-4 font-bold">Provisioned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mist-100 dark:divide-dark-border text-xs">
                    {filteredUsers.map(u => (
                      <tr key={u._id} className="hover:bg-violet-50/30 dark:hover:bg-violet-950/10 transition-colors group">
                        <td className="py-3.5 px-5 font-semibold text-mist-900 dark:text-white">{u.name}</td>
                        <td className="py-3.5 px-4 font-mono text-mist-500 dark:text-dark-muted">@{u.username}</td>
                        <td className="py-3.5 px-4"><RoleBadge role={u.role} /></td>
                        <td className="py-3.5 px-4 text-mist-600 dark:text-dark-muted max-w-[180px] truncate">{u.department}</td>
                        <td className="py-3.5 px-4">
                          {u.hasCompletedOnboarding
                            ? <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> Done</span>
                            : <span className="text-amber-600 dark:text-amber-400">Pending</span>}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-mist-400 dark:text-dark-muted text-[11px]">
                          {new Date(u.createdAt).toLocaleDateString('en-GB')}
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-mist-400 dark:text-dark-muted text-sm">
                          <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          No accounts match your search criteria
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-mist-100 dark:border-dark-border flex items-center justify-between bg-mist-50/30 dark:bg-dark-surface/20">
                <p className="text-[11px] text-mist-500 dark:text-dark-muted">
                  Showing {filteredUsers.length} of {users.length} accounts
                </p>
                <button onClick={handleRefresh}
                  className="text-[11px] text-violet-500 hover:text-violet-700 font-semibold flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Sync
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── ANALYTICS TAB ───────────────────────────────────────────────── */}
        {activeTab === 'analytics' && (
          <div className="space-y-5 animate-fade-in">
            {/* Score Distribution */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Distinction (90–100%)', value: analytics?.scoreDistribution?.distDistinction ?? 0, color: 'bg-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300' },
                { label: 'Pass (75–89%)', value: analytics?.scoreDistribution?.distPass ?? 0, color: 'bg-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' },
                { label: 'Near-Miss (60–74%)', value: analytics?.scoreDistribution?.distNearMiss ?? 0, color: 'bg-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300' },
                { label: 'Fail (<60%)', value: analytics?.scoreDistribution?.distFail ?? 0, color: 'bg-red-500', bgColor: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300' },
              ].map(({ label, value, color, bgColor }) => {
                const total = totalAttempts || 1;
                const pct = Math.round((value / total) * 100);
                return (
                  <div key={label} className={`rounded-2xl p-4 border ${bgColor}`}>
                    <p className="text-[11px] font-bold uppercase tracking-wider mb-2 opacity-70">{label}</p>
                    <p className="text-3xl font-black mb-1">{value}</p>
                    <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] mt-1 opacity-60">{pct}% of all sessions</p>
                  </div>
                );
              })}
            </div>

            {/* Detailed Category Breakdown */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-card dark:shadow-card-dark border border-mist-300 dark:border-dark-border p-5">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase font-bold tracking-wider text-red-500">Vulnerability Analysis</p>
                  <h3 className="text-sm font-bold text-mist-900 dark:text-white">Hazard Category Miss Rates</h3>
                </div>
              </div>
              {analytics?.categoryBreakdown?.length > 0 ? (
                <div className="space-y-4">
                  {analytics.categoryBreakdown.sort((a, b) => b.missRatePercentage - a.missRatePercentage).map(cat => (
                    <div key={cat.category} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                            cat.riskLevel === 'CRITICAL' ? 'bg-red-500' :
                            cat.riskLevel === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} />
                          <span className="text-xs font-semibold text-mist-800 dark:text-white">{cat.category}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-mist-500 dark:text-dark-muted">
                            {cat.spotted} spotted · {cat.missed} missed
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            cat.riskLevel === 'CRITICAL' ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400' :
                            cat.riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' :
                            'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                          }`}>{cat.riskLevel} · {cat.missRatePercentage}% miss</span>
                        </div>
                      </div>
                      <div className="w-full h-2.5 bg-mist-100 dark:bg-dark-surface rounded-full overflow-hidden">
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
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No analytics data yet</p>
                  <p className="text-xs mt-1">Analytics populate as trainees complete 360° sessions.</p>
                </div>
              )}
            </div>

            {/* Summary stats row */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-dark-card rounded-2xl border border-mist-300 dark:border-dark-border p-4 shadow-card">
                <p className="text-[11px] uppercase font-bold tracking-wider text-mist-500 dark:text-dark-muted mb-1">Avg. Session Time</p>
                <p className="text-3xl font-black text-mist-900 dark:text-white">
                  {analytics?.avgTimeTakenSeconds ?? 0}<span className="text-base font-medium ml-1">s</span>
                </p>
                <p className="text-[11px] text-mist-500 mt-1">Time to complete inspection phase</p>
              </div>
              <div className="bg-white dark:bg-dark-card rounded-2xl border border-mist-300 dark:border-dark-border p-4 shadow-card">
                <p className="text-[11px] uppercase font-bold tracking-wider text-mist-500 dark:text-dark-muted mb-1">Avg. False Clicks</p>
                <p className="text-3xl font-black text-mist-900 dark:text-white">{analytics?.avgFalseClicksCount ?? 0}</p>
                <p className="text-[11px] text-mist-500 mt-1">Penalty clicks per session (avg)</p>
              </div>
              <div className="bg-white dark:bg-dark-card rounded-2xl border border-mist-300 dark:border-dark-border p-4 shadow-card">
                <p className="text-[11px] uppercase font-bold tracking-wider text-mist-500 dark:text-dark-muted mb-1">Highest Risk Category</p>
                <p className="text-sm font-black text-red-600 dark:text-red-400 leading-tight">
                  {worstCategory?.category || 'N/A'}
                </p>
                <p className="text-[11px] text-mist-500 mt-1">{worstCategory?.missRatePercentage ?? 0}% miss rate</p>
              </div>
            </div>
          </div>
        )}

        {/* ── SYSTEM STATUS TAB ───────────────────────────────────────────── */}
        {activeTab === 'system' && (
          <div className="space-y-5 animate-fade-in">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: Server, label: 'API Server', sub: 'Node.js 20 + Express', status: true, meta: 'Port 5000 • REST API' },
                { icon: Database, label: 'Database', sub: 'MongoDB (embedded)', status: true, meta: `${users.length} accounts stored` },
                { icon: Wifi, label: 'Frontend', sub: 'React 18 + Vite', status: true, meta: 'Port 5173 • Hot Reload' },
                { icon: Shield, label: 'Auth System', sub: 'JWT Bearer Tokens', status: true, meta: '24h expiry · Role-locked' },
                { icon: HardDrive, label: 'Storage Engine', sub: 'Compliance Records', status: true, meta: `${totalAttempts} sessions stored` },
                { icon: Cpu, label: 'Session Engine', sub: '360° Pannellum Viewer', status: true, meta: 'Client-side renderer' },
              ].map(({ icon: Icon, label, sub, status, meta }) => (
                <div key={label} className="bg-white dark:bg-dark-card rounded-2xl border border-mist-300 dark:border-dark-border p-5 shadow-card">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-mist-100 dark:bg-dark-surface flex items-center justify-center">
                      <Icon className="w-5 h-5 text-violet-500" />
                    </div>
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      ONLINE
                    </span>
                  </div>
                  <p className="text-sm font-bold text-mist-900 dark:text-white">{label}</p>
                  <p className="text-xs text-mist-600 dark:text-dark-muted">{sub}</p>
                  <p className="text-[11px] text-mist-400 dark:text-dark-muted mt-1.5 font-mono">{meta}</p>
                </div>
              ))}
            </div>

            {/* Tech stack breakdown */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-card dark:shadow-card-dark border border-mist-300 dark:border-dark-border p-5">
              <h3 className="text-sm font-bold text-mist-900 dark:text-white mb-4">Technology Stack</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { section: 'Frontend', items: ['React 18 + Vite (SPA)', 'Tailwind CSS v3', 'Pannellum (360° viewer)', 'Lucide Icons', 'DM Sans typography'] },
                  { section: 'Backend', items: ['Node.js 20 + Express 4', 'Mongoose v8 ODM', 'MongoDB (embedded MMS)', 'JWT Authentication', 'bcryptjs password hashing'] },
                ].map(({ section, items }) => (
                  <div key={section}>
                    <p className="text-[11px] uppercase font-bold tracking-wider text-violet-500 mb-2">{section}</p>
                    <ul className="space-y-1.5">
                      {items.map(item => (
                        <li key={item} className="flex items-center gap-2 text-xs text-mist-700 dark:text-dark-muted">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-card dark:shadow-card-dark border border-mist-300 dark:border-dark-border p-5">
              <h3 className="text-sm font-bold text-mist-900 dark:text-white mb-3">Security Controls</h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {[
                  'Role-locked login portals (employee/supervisor/admin tabs)',
                  'Server-side role verification on every protected endpoint',
                  'Supervisors can only create Employee accounts (never Supervisor/Admin)',
                  'Compliance scores calculated server-side (tamper-proof)',
                  'JWT tokens expire in 24 hours (auto re-auth)',
                  'Passwords hashed with bcrypt (salt rounds: 12)',
                ].map(item => (
                  <div key={item} className="flex items-start gap-2 text-xs text-mist-700 dark:text-dark-muted">
                    <Lock className="w-3.5 h-3.5 text-violet-500 flex-shrink-0 mt-0.5" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── CREATE USER MODAL ─────────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-dark-card rounded-3xl shadow-2xl max-w-md w-full border border-mist-300 dark:border-dark-border overflow-hidden animate-slide-up">
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <UserPlus className="w-5 h-5" />
                  <h3 className="text-base font-bold">Provision New Account</h3>
                </div>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-violet-200 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-violet-200 text-xs mt-1">Admin can create Supervisor or Employee accounts</p>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-mist-700 dark:text-dark-muted mb-1.5">Full Name *</label>
                  <input type="text" required placeholder="e.g. David Ross" value={newName} onChange={e => setNewName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-mist-300 dark:border-dark-border bg-mist-50 dark:bg-dark-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-mist-700 dark:text-dark-muted mb-1.5">Username *</label>
                  <input type="text" required placeholder="e.g. supervisor2" value={newUsername} onChange={e => setNewUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-mist-300 dark:border-dark-border bg-mist-50 dark:bg-dark-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-mist-700 dark:text-dark-muted mb-1.5">Password *</label>
                <input type="password" required placeholder="Min. 6 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-mist-300 dark:border-dark-border bg-mist-50 dark:bg-dark-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-mist-700 dark:text-dark-muted mb-1.5">Role</label>
                  <select value={newRole} onChange={e => setNewRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-mist-300 dark:border-dark-border bg-mist-50 dark:bg-dark-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40">
                    <option value="supervisor">Supervisor (HSE)</option>
                    <option value="employee">Employee (Trainee)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-mist-700 dark:text-dark-muted mb-1.5">Department</label>
                  <input type="text" value={newDept} onChange={e => setNewDept(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-mist-300 dark:border-dark-border bg-mist-50 dark:bg-dark-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40" />
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-3">
                <p className="text-[11px] text-blue-700 dark:text-blue-300 flex items-start gap-1.5">
                  <Lock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>Admin can provision both Supervisors and Employees. Supervisors may only provision Employees.</span>
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-mist-700 dark:text-dark-muted bg-mist-100 dark:bg-dark-surface hover:bg-mist-200 dark:hover:bg-dark-border transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isCreating}
                  className="flex-1 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-xs font-bold shadow-violet transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {isCreating ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Provisioning…</> : <><CheckCircle2 className="w-3.5 h-3.5" /> Provision Account</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── LOGOUT CONFIRM MODAL ─────────────────────────────────────────── */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-sm w-full border border-mist-300 dark:border-dark-border p-6 animate-slide-up">
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/40 flex items-center justify-center mx-auto mb-3">
                <LogOut className="w-7 h-7 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-base font-bold text-mist-900 dark:text-white">Sign Out of Admin Console?</h3>
              <p className="text-xs text-mist-500 dark:text-dark-muted mt-1.5">
                You'll need to re-authenticate to access the System Administrator portal.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-mist-100 dark:bg-dark-surface text-mist-700 dark:text-dark-muted hover:bg-mist-200 transition-colors">
                Stay Signed In
              </button>
              <button onClick={() => { logout(); setShowLogoutConfirm(false); }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-all">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
