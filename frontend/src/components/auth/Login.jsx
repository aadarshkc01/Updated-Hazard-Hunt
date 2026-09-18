import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { UserManualModal } from '../common/UserManualModal';
import { soundEngine } from '../../utils/audio';
import {
  ShieldAlert,
  UserCheck,
  Briefcase,
  KeyRound,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Lock,
  Sun,
  Moon,
} from 'lucide-react';

export const Login = () => {
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { showToast } = useToast();

  const [selectedRole, setSelectedRole] = useState('employee');
  const [username, setUsername] = useState('trainee1');
  const [password, setPassword] = useState('SafetyPass123!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showManual, setShowManual] = useState(false);

  // Quick preset configurations for instant demo presentation
  const setPreset = (role, user, pass) => {
    setSelectedRole(role);
    setUsername(user);
    setPassword(pass);
    setError(null);
    soundEngine.playTick();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    soundEngine.init();

    try {
      // Pass requestedRole to enforce strict role-portal boundaries
      await login(username, password, selectedRole);
      soundEngine.playSuccess();
      showToast(`Welcome back! Signed in as ${selectedRole.toUpperCase()}`, 'success');
    } catch (err) {
      soundEngine.playWarning();
      const msg = err.message || 'Authentication failed. Please check credentials.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-shell dark:bg-dark-bg text-mist-900 dark:text-dark-text flex flex-col justify-between transition-colors duration-200 selection:bg-primary-500 selection:text-white">
      {/* Top Academic Banner */}
      <div className="bg-mist-900 dark:bg-black text-white py-2 px-4 text-xs font-medium border-b border-primary-500/30 flex items-center justify-between">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <span className="inline-flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-primary-500 animate-ping" />
            <span>
              <strong>CET257 Enterprise Project</strong> (University of Sunderland) — Team: <strong>Macro Thinkers</strong> | Client: <em>Automotive Logistics & Warehousing</em>
            </span>
          </span>

          <button
            onClick={toggleTheme}
            className="p-1 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
            title="Toggle theme"
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Login Card Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          {/* Brand Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary-500 text-white shadow-sm mb-4">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-mist-900 dark:text-white">
              HAZARD <span className="text-primary-500">HUNT</span>
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-mist-600 dark:text-dark-muted font-medium">
              360° Interactive Warehouse Hazard Perception Trainer
            </p>
          </div>

          {/* Card */}
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-mist-300 dark:border-dark-border p-6 sm:p-8 relative overflow-hidden transition-all">

            {/* Role Selector Tabs */}
            <div className="mb-6">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-mist-600 dark:text-dark-muted mb-2">
                Select Your Portal Role
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-mist-200 dark:bg-dark-surface rounded-xl border border-mist-300 dark:border-dark-border">
                <button
                  type="button"
                  onClick={() => setPreset('employee', 'trainee1', 'SafetyPass123!')}
                  className={`py-2 px-2 text-xs font-bold rounded-lg transition-all flex flex-col items-center space-y-1 ${
                    selectedRole === 'employee'
                      ? 'bg-white dark:bg-dark-card text-mist-900 dark:text-white shadow-sm border border-primary-500/30'
                      : 'text-mist-600 dark:text-dark-muted hover:text-mist-900 dark:hover:text-white'
                  }`}
                >
                  <UserCheck className={`w-4 h-4 ${selectedRole === 'employee' ? 'text-primary-500' : ''}`} />
                  <span>Employee</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreset('supervisor', 'supervisor1', 'SuperVisor2026!')}
                  className={`py-2 px-2 text-xs font-bold rounded-lg transition-all flex flex-col items-center space-y-1 ${
                    selectedRole === 'supervisor'
                      ? 'bg-white dark:bg-dark-card text-mist-900 dark:text-white shadow-sm border border-primary-500/30'
                      : 'text-mist-600 dark:text-dark-muted hover:text-mist-900 dark:hover:text-white'
                  }`}
                >
                  <Briefcase className={`w-4 h-4 ${selectedRole === 'supervisor' ? 'text-primary-500' : ''}`} />
                  <span>Supervisor</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreset('admin', 'admin1', 'AdminMaster2026!')}
                  className={`py-2 px-2 text-xs font-bold rounded-lg transition-all flex flex-col items-center space-y-1 ${
                    selectedRole === 'admin'
                      ? 'bg-white dark:bg-dark-card text-mist-900 dark:text-white shadow-sm border border-primary-500/30'
                      : 'text-mist-600 dark:text-dark-muted hover:text-mist-900 dark:hover:text-white'
                  }`}
                >
                  <KeyRound className={`w-4 h-4 ${selectedRole === 'admin' ? 'text-primary-500' : ''}`} />
                  <span>Admin</span>
                </button>
              </div>
            </div>

            {/* Error Message with Role Boundary notice */}
            {error && (
              <div className="mb-5 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-start space-x-2.5 animate-slide-down">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="leading-relaxed font-medium">{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-mist-700 dark:text-dark-muted mb-1.5">
                  Assigned Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. trainee1"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-mist-300 dark:border-dark-border text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 bg-mist-100 dark:bg-dark-surface dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-mist-700 dark:text-dark-muted mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-mist-300 dark:border-dark-border text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 bg-mist-100 dark:bg-dark-surface dark:text-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-start space-x-2 py-1">
                <input
                  type="checkbox"
                  id="terms"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="terms" className="text-xs text-mist-600 dark:text-dark-muted leading-tight">
                  I agree to the Terms and Conditions. By logging in, I consent to the recording of my compliance audit sessions.{' '}
                  <button type="button" onClick={() => setShowManual(true)} className="text-primary-500 hover:underline">View User Manual</button>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !termsAccepted}
                className="w-full mt-2 py-3 px-4 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-60"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Enter {selectedRole.toUpperCase()} Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* FR-11 Notice */}
            <div className="mt-5 pt-4 border-t border-mist-200 dark:border-dark-border text-center">
              <p className="text-[11px] text-mist-600 dark:text-dark-muted flex items-center justify-center">
                <Lock className="w-3 h-3 inline mr-1 text-gray-400" />
                No public registration. Credentials are electronically issued by HSE Supervisors.
              </p>
            </div>

            {/* Quick Demo Pre-fill Chips */}
            <div className="mt-4 pt-3 border-t border-dashed border-mist-300 dark:border-dark-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-mist-500 dark:text-dark-muted flex items-center">
                  1-Click Demo Fill:
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreset('employee', 'trainee1', 'SafetyPass123!')}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-mist-100 dark:bg-dark-surface hover:bg-mist-200 dark:hover:bg-mist-800 text-mist-900 dark:text-white border border-mist-300 dark:border-dark-border transition-colors"
                >
                  Trainee (Alex Morgan)
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('supervisor', 'supervisor1', 'SuperVisor2026!')}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-mist-100 dark:bg-dark-surface hover:bg-mist-200 dark:hover:bg-mist-800 text-mist-900 dark:text-white border border-mist-300 dark:border-dark-border transition-colors"
                >
                  Supervisor (Eleanor Vance)
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('admin', 'admin1', 'AdminMaster2026!')}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-mist-100 dark:bg-dark-surface hover:bg-mist-200 dark:hover:bg-mist-800 text-mist-900 dark:text-white border border-mist-300 dark:border-dark-border transition-colors"
                >
                  Admin (Marcus Sterling)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 px-6 text-center text-xs text-mist-600 dark:text-dark-muted border-t border-mist-300 dark:border-dark-border">
        Hazard Hunt 360° Perception Trainer &copy; 2026 Macro Thinkers — CET257 Enterprise Project
      </footer>

      <UserManualModal isOpen={showManual} onClose={() => setShowManual(false)} />
    </div>
  );
};
