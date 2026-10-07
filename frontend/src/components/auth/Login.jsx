import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { UserManualModal } from '../common/UserManualModal';
import { soundEngine } from '../../utils/audio';
import {
  ShieldAlert,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Sun,
  Moon,
} from 'lucide-react';

const PORTALS = [
  { role: 'employee', label: 'Trainee', user: 'trainee1', pass: 'SafetyPass123!' },
  { role: 'supervisor', label: 'Supervisor', user: 'supervisor1', pass: 'SuperVisor2026!' },
  { role: 'admin', label: 'Admin', user: 'admin1', pass: 'AdminMaster2026!' },
];

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

  const setPreset = (portal) => {
    setSelectedRole(portal.role);
    setUsername(portal.user);
    setPassword(portal.pass);
    setError(null);
    soundEngine.playTick();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    soundEngine.init();
    try {
      await login(username, password, selectedRole);
      soundEngine.playSuccess();
      showToast(`Signed in to the ${selectedRole} portal`, 'success');
    } catch (err) {
      soundEngine.playWarning();
      const msg = err.message || 'Authentication failed. Please check your credentials.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-app-shell dark:bg-dark-bg">
      {/* Academic banner */}
      <div className="border-b border-mist-200 bg-mist-900 px-4 py-2 text-mist-200 dark:border-dark-border dark:bg-dark-card">
        <div className="app-page flex items-center justify-between gap-3 text-[11px]">
          <p className="min-w-0 truncate">
            <strong className="font-bold">CET257 Enterprise Project</strong> · Team Macro Thinkers ·
            <span className="hidden sm:inline"> Automotive Logistics &amp; Warehousing</span>
          </p>
          <button
            type="button"
            onClick={toggleTheme}
            className="app-icon-btn h-8 w-8 border-dark-border bg-dark-surface text-mist-300 hover:border-primary-500 hover:text-primary-400"
            title="Toggle theme"
            aria-label="Toggle colour theme"
          >
            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Sign-in */}
      <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="app-icon-well mx-auto mb-3 h-14 w-14">
              <ShieldAlert className="h-7 w-7" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-mist-900 dark:text-dark-text">
              HAZARD<span className="text-primary-500">HUNT</span>
            </h1>
            <p className="app-body mt-1.5">
              360° interactive warehouse hazard perception trainer
            </p>
          </div>

          <div className="app-card p-5 sm:p-7">
            {/* Portal picker */}
            <div className="mb-5">
              <p className="app-label">Select your portal</p>
              <div className="app-seg">
                {PORTALS.map((p) => (
                  <button
                    key={p.role}
                    type="button"
                    onClick={() => setPreset(p)}
                    aria-pressed={selectedRole === p.role}
                    className={`app-seg-item ${
                      selectedRole === p.role ? 'app-seg-item-active' : ''
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="app-alert app-alert-stop mb-4">
                <AlertCircle className="app-alert-icon" aria-hidden="true" />
                <span>{error}</span>
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="username" className="app-label">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. trainee1"
                  autoComplete="username"
                  className="app-input"
                />
              </div>

              <div>
                <label htmlFor="password" className="app-label">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="app-input pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mist-400 hover:text-mist-700 dark:hover:text-dark-text"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="terms"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-mist-300 text-primary-500 focus:ring-primary-500 dark:border-dark-border dark:bg-dark-surface"
                />
                <label htmlFor="terms" className="app-body">
                  I consent to my compliance assessment sessions being recorded.{' '}
                  <button
                    type="button"
                    onClick={() => setShowManual(true)}
                    className="app-link"
                  >
                    Read the user manual
                  </button>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !termsAccepted}
                className="app-btn app-btn-primary w-full py-2.5"
              >
                {loading ? (
                  <>
                    <span className="app-spinner" aria-hidden="true" />
                    Signing in
                  </>
                ) : (
                  <>
                    Enter {selectedRole} portal
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            {/* Demo credentials */}
            <div className="app-divider mt-5 pt-4">
              <p className="app-eyebrow mb-2">Demo credentials · one click</p>
              <div className="grid gap-1.5">
                {PORTALS.map((p) => (
                  <button
                    key={p.role}
                    type="button"
                    onClick={() => setPreset(p)}
                    className="app-btn app-btn-secondary app-btn-sm justify-between"
                  >
                    <span>{p.label}</span>
                    <span className="app-num text-[11px] font-medium text-mist-500 dark:text-dark-muted">
                      {p.user}
                    </span>
                  </button>
                ))}
              </div>
              <p className="app-stat-sub mt-3">
                No public registration — credentials are issued by HSE supervisors.
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer className="app-divider px-4 py-4 text-center text-[11px] text-mist-500 dark:text-dark-muted">
        Hazard Hunt © 2026 Macro Thinkers — CET257 Enterprise Project, University of Sunderland
      </footer>

      <UserManualModal isOpen={showManual} onClose={() => setShowManual(false)} />
    </div>
  );
};