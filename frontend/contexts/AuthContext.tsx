import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as apiLogin, getMe } from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'manager';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const userData = await getMe();
        setUser(userData);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      await AsyncStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    await AsyncStorage.setItem('token', data.access_token);
    setUser(data.user);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
