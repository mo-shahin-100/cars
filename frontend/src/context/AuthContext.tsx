import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, getAuthToken, setAuthToken, removeAuthToken } from '../services/api';
import { syncEngine } from '../services/syncEngine';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permissionCode: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({} as any);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    api.getMe()
      .then((res) => {
        setUser(res.data);
        syncEngine.init();
      })
      .catch(() => {
        removeAuthToken();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api.login({ username, password });
    setAuthToken(res.data.token);
    setUser(res.data.user);
    syncEngine.init();
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
  };

  const hasPermission = (permissionCode: string): boolean => {
    if (!user) return false;
    if (user.role === 'owner') return true;
    return user.permissions?.includes(permissionCode) || false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
