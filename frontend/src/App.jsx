import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppShell } from './components/common/Navbar';
import { Login } from './components/auth/Login';
import { TraineeExperience } from './components/trainee/TraineeExperience';
import { SupervisorDashboard } from './components/dashboard/SupervisorDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';

const SplashScreen = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-app-shell dark:bg-dark-bg">
    <span className="app-spinner text-primary-500" />
    <p className="app-eyebrow">Synchronising enterprise portal</p>
  </div>
);

const SCREENS = {
  employee: TraineeExperience,
  supervisor: SupervisorDashboard,
  admin: AdminDashboard,
};

const MainApp = () => {
  const { role, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <SplashScreen />;
  if (!isAuthenticated) return <Login />;

  const Screen = SCREENS[role];
  if (!Screen) return null;

  // Every role renders inside the identical navbar + footer chrome.
  return (
    <AppShell>
      <Screen />
    </AppShell>
  );
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