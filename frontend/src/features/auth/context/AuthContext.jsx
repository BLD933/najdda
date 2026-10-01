import React, { createContext, useState, useEffect, useContext } from 'react';
import authService from '../services/authService';
import { readStore, writeStore, removeStore } from '../../../utils/storage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshUser = async () => {
    const { user } = await authService.getMe();
    setUser(user);
    return user;
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = readStore('najdda_token');
      if (token) {
        try {
          await refreshUser();
        } catch (err) {
          const status = err.response?.status;
          if (status === 401 || status === 403) {
            removeStore('najdda_token');
            setUser(null);
          }
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Fired by the apiClient response interceptor on an expired session. Without
  // this the provider kept `user` truthy while the token was gone, so
  // ProtectedRoute kept rendering the protected page with no session behind it.
  useEffect(() => {
    const onExpired = () => {
      removeStore('najdda_token');
      removeStore('najdda_profile_draft');
      setUser(null);
      setError(null);
    };
    window.addEventListener('najdda:session-expired', onExpired);
    return () => window.removeEventListener('najdda:session-expired', onExpired);
  }, []);

  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const { user, token } = await authService.login(credentials);
      writeStore('najdda_token', token);
      setUser(user);
      return user;
    } catch (err) {
      // The whole axios error is kept, not just its message: the form needs
      // `err.response` to tell a rejected password (401) from an unreachable
      // API (no response) or a 503, and `err.message` to detect a timeout.
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const { user, token } = await authService.register(userData);
      writeStore('najdda_token', token);
      setUser(user);
      return user;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // A failed attempt left its message on screen while the patient typed the
  // correction, and the context error is shared between /login and /register —
  // so a stale "Invalid credentials" followed the user across pages.
  const clearError = () => setError(null);

  const logout = () => {
    removeStore('najdda_token');
    removeStore('najdda_profile_draft');
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        refreshUser,
        clearError,
        loading,
        error,
        login,
        register,
        logout,
        isAuthenticated: !!user,
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
