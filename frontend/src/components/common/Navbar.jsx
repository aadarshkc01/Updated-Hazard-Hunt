import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { soundEngine } from '../../utils/audio';
import { ConfirmModal } from './ConfirmModal';
import {
  ShieldAlert,
  LogOut,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Sparkles,
  LayoutDashboard,
  Eye,
} from 'lucide-react';

export const Navbar = ({ isPracticeMode = false, currentView, onViewChange }) => {
  const { user, role, logout } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const [isMuted, setIsMuted] = useState(soundEngine.isMuted);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleToggleAudio = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
    if (!muted) {
      soundEngine.playSuccess();
      showToast('Sound effects enabled', 'info');
    } else {
      showToast('Sound effects muted', 'info');
    }
  };

  const handleThemeChange = () => {
    toggleTheme();
    soundEngine.playTick();
    showToast(`Switched to ${theme === 'light' ? 'Dark' : 'Light'} Mode`, 'info');
  };

  const handleConfirmLogout = () => {
    soundEngine.playWarning();
    showToast('Signed out of Hazard Hunt', 'info');
    logout();
  };

  const getRoleBadge = (r) => {
    switch (r) {
      case 'admin':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-100 text-primary-800 dark:bg-primary-950/60 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
            SYSTEM ADMIN
          </span>
        );
      case 'supervisor':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-mist-100 text-mist-800 dark:bg-dark-surface dark:text-dark-text border border-mist-300 dark:border-dark-border">
            HSE SUPERVISOR
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
            TRAINEE
          </span>
        );
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 transition-colors duration-200 bg-white/90 dark:bg-dark-card/90 backdrop-blur-md border-b border-mist-300 dark:border-dark-border px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center shadow-sm text-white">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-extrabold tracking-tight text-mist-900 dark:text-white">
                  HAZARD<span className="text-primary-500">HUNT</span>
                </span>
                <span className="text-[10px] font-mono tracking-widest uppercase px-1.5 py-0.5 rounded bg-mist-300/60 dark:bg-dark-surface text-mist-700 dark:text-dark-muted font-bold">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-mist-600 dark:text-dark-muted font-medium hidden sm:block">
                360° Warehouse Safety Perception Trainer
              </p>
            </div>
          </div>



          {/* Right Controls */}
          <div className="flex items-center space-x-2.5">
            {/* Practice Mode Badge */}
            {isPracticeMode && (
              <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-bold text-amber-800 dark:text-amber-300 animate-pulse">
                <span>PRACTICE MODE</span>
              </div>
            )}

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={handleThemeChange}
              title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
              className="p-2.5 rounded-xl bg-mist-100 dark:bg-dark-surface border border-mist-300 dark:border-dark-border text-mist-700 dark:text-dark-text hover:text-primary-500 hover:border-primary-500/40 transition-all shadow-sm"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            {/* Sound Toggle */}
            <button
              onClick={handleToggleAudio}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              className="p-2.5 rounded-xl bg-mist-100 dark:bg-dark-surface border border-mist-300 dark:border-dark-border text-mist-700 dark:text-dark-text hover:text-primary-500 hover:border-primary-500/40 transition-all shadow-sm"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-red-500" />
              ) : (
                <Volume2 className="w-4 h-4 text-primary-500" />
              )}
            </button>

            {/* User Profile & Logout */}
            {user && (
              <div className="flex items-center space-x-3 pl-2 border-l border-mist-300 dark:border-dark-border">
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-bold text-mist-900 dark:text-white leading-tight">
                    {user.name}
                  </div>
                  <div className="mt-0.5">{getRoleBadge(user.role)}</div>
                </div>

                {/* Logout Button with Confirmation Modal Trigger */}
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  title="Sign out"
                  className="p-2.5 rounded-xl bg-mist-100 dark:bg-dark-surface border border-mist-300 dark:border-dark-border text-mist-600 dark:text-dark-muted hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-900/50 transition-all shadow-sm"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Confirmation Modal for Logout */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Sign Out of Hazard Hunt"
        message={`Are you sure you want to end your session, ${user?.name}? Any unsaved training attempt will be terminated.`}
        confirmText="Yes, Sign Out"
        cancelText="Stay Signed In"
        isDestructive={true}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          handleConfirmLogout();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
};
