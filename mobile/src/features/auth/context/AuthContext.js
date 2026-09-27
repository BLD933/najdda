import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import authService from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      const token = await SecureStore.getItemAsync('shifaa_token');
      if (token) {
        try {
          const { user } = await authService.getMe();
          setUser(user);
        } catch (err) {
          await SecureStore.deleteItemAsync('shifaa_token');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const { user, token } = await authService.login(credentials);
      await SecureStore.setItemAsync('shifaa_token', token);
      setUser(user);
      return user;
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const { user, token } = await authService.register(userData);
      await SecureStore.setItemAsync('shifaa_token', token);
      setUser(user);
      return user;
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('shifaa_token');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const { user: freshUser } = await authService.getMe();
      setUser(freshUser);
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  const isProfileComplete = !!(
    user?.profile?.dateOfBirth &&
    user?.profile?.bloodType &&
    user?.profile?.city &&
    user?.profile?.phoneNumber &&
    user?.profile?.gender &&
    user?.profile?.weight &&
    user?.profile?.height
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
        refreshUser,
        isAuthenticated: !!user,
        isProfileComplete,
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
