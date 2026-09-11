import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('hazard_hunt_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('hazard_hunt_token');
      if (storedToken) {
        try {
          const res = await api.getMe();
          if (res.success) {
            setUser(res.user);
          } else {
            logout();
          }
        } catch (err) {
          console.warn('Session verification failed, logging out:', err.message);
          logout();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username, password, requestedRole) => {
    const res = await api.login(username, password, requestedRole);
    if (res.success && res.token) {
      localStorage.setItem('hazard_hunt_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    }
    throw new Error('Authentication failed');
  };

  const logout = () => {
    localStorage.removeItem('hazard_hunt_token');
    setToken(null);
    setUser(null);
  };

  const markOnboardingComplete = async () => {
    try {
      const res = await api.completeOnboarding();
      if (res.success) {
        setUser((prev) => ({ ...prev, hasCompletedOnboarding: true }));
      }
    } catch (err) {
      console.error('Failed to mark onboarding complete:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || null,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        logout,
        markOnboardingComplete,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
