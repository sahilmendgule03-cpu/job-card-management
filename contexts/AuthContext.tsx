'use client';

import { login as authLogin, logout as authLogout, getCurrentUser } from '@/lib/auth';
import type { User } from '@/models/user';
import { createContext, useContext, useEffect, useState } from 'react';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error: string | null }>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const { user: loggedInUser, error } = await authLogin(username, password);
    if (loggedInUser) {
      setUser(loggedInUser);
      return { success: true, error: null };
    }
    return { success: false, error: error || 'Login failed' };
  };

  const logout = () => {
    authLogout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
