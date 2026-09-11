import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Login } from './components/auth/Login';
import { TraineeExperience } from './components/trainee/TraineeExperience';
import { SupervisorDashboard } from './components/dashboard/SupervisorDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';

const MainApp = () => {
  const { user, role, isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mist-200 dark:bg-dark-bg flex flex-col items-center justify-center transition-colors">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs font-bold uppercase tracking-wider text-mist-700 dark:text-dark-muted">
          Synchronizing Enterprise Portal...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  // Employee role: show standard Navbar + trainee experience
  if (role === 'employee') {
    return (
      <div className="min-h-screen bg-mist-200 dark:bg-dark-bg text-mist-900 dark:text-dark-text flex flex-col selection:bg-violet-500 selection:text-white transition-colors duration-200">
        <Navbar currentView={currentView} onViewChange={setCurrentView} />
        <main className="flex-1">
          <TraineeExperience />
        </main>
        <footer className="bg-white dark:bg-dark-card border-t border-mist-300 dark:border-dark-border py-3 px-6 text-center text-xs text-mist-500 dark:text-dark-muted transition-colors">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5">
            <span>
              <strong>Hazard Hunt</strong> &copy; 2026 Macro Thinkers • CET257 Enterprise Project (University of Sunderland)
            </span>
            <span className="font-mono text-[11px] text-mist-400 dark:text-dark-muted">
              Automotive Logistics &amp; Warehousing Safety Engine
            </span>
          </div>
        </footer>
      </div>
    );
  }

  // Supervisor: self-contained dashboard with built-in header, or 360° trainer view
  if (role === 'supervisor') {
    if (currentView === 'trainer') {
      return (
        <div className="min-h-screen bg-mist-200 dark:bg-dark-bg text-mist-900 dark:text-dark-text flex flex-col selection:bg-violet-500 selection:text-white transition-colors duration-200">
          <Navbar currentView={currentView} onViewChange={setCurrentView} />
          <main className="flex-1">
            <TraineeExperience />
          </main>
        </div>
      );
    }
    return <SupervisorDashboard />;
  }

  // Admin: self-contained dashboard with built-in header, or 360° trainer view
  if (role === 'admin') {
    if (currentView === 'trainer') {
      return (
        <div className="min-h-screen bg-mist-200 dark:bg-dark-bg text-mist-900 dark:text-dark-text flex flex-col selection:bg-violet-500 selection:text-white transition-colors duration-200">
          <Navbar currentView={currentView} onViewChange={setCurrentView} />
          <main className="flex-1">
            <TraineeExperience />
          </main>
        </div>
      );
    }
    return <AdminDashboard onLaunchTrainer={() => setCurrentView('trainer')} />;
  }

  return null;
};

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
