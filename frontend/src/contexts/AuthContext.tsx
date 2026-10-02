import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  roles: string[];
  permissions: string[];
  departments: { id: string; name: string; code: string }[];
  firstName: string;
  lastName: string;
  twoFactorEnabled: boolean;
  twoFactorType: 'EMAIL' | 'TOTP' | 'NONE';
  profilePicture: string | null;
  designation?: string;
  staffId: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (usernameOrEmail: string, password: string, trustDevice?: boolean) => Promise<{ requires2FA?: boolean; twoFactorType?: string; tempToken?: string; requiresPasswordChange?: boolean; username?: string } | void>;
  verify2FA: (tempToken: string, code: string, trustDevice?: boolean) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  checkPermission: (permissionCode: string) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem('cached_user');
    if (cached) {
      try { return JSON.parse(cached); } catch (_) {}
    }
    return null;
  });
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(() => !!localStorage.getItem('token') && !localStorage.getItem('cached_user'));

  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      if (token) {
        try {
          const response = await api.get('/auth/me');
          if (isMounted) {
            setUser(response.data);
            localStorage.setItem('cached_user', JSON.stringify(response.data));
          }
        } catch (error) {
          // If offline or network error, fallback to cached user instead of logging out!
          const cached = localStorage.getItem('cached_user');
          if (cached) {
            try {
              if (isMounted) setUser(JSON.parse(cached));
            } catch (e) {
              localStorage.removeItem('token');
              if (isMounted) setToken(null);
            }
          } else {
            localStorage.removeItem('token');
            if (isMounted) setToken(null);
          }
        }
      }
      if (isMounted) {
        setIsLoading(false);
      }
    };
    initAuth();

    const handleUnauthorized = () => {
      if (isMounted) {
        setUser(null);
        setToken(null);
        setIsLoading(false);
      }
    };
    window.addEventListener('auth-unauthorized', handleUnauthorized);

    return () => {
      isMounted = false;
      window.removeEventListener('auth-unauthorized', handleUnauthorized);
    };
  }, [token]);

  const login = async (usernameOrEmail: string, password: string, trustDevice?: boolean) => {
    const trustedDeviceToken = localStorage.getItem('trusted_device_token') || undefined;
    try {
      const response = await api.post('/auth/login', {
        usernameOrEmail,
        password,
        trustDevice,
        trustedDeviceToken,
      });
      
      if (response.data.requires2FA || response.data.requiresPasswordChange) {
        return response.data;
      }

      const { token: newToken, user: newUser, trustedDeviceToken: newDeviceToken } = response.data;
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('token', newToken);
      localStorage.setItem('cached_user', JSON.stringify(newUser));
      if (newDeviceToken) {
        localStorage.setItem('trusted_device_token', newDeviceToken);
      }
    } catch (err: any) {
      // If the local hospital server is completely unreachable, provide a clear diagnostic error
      if (!err.response) {
        throw new Error('Cannot reach hospital local server. Please ensure the local server is running on the network.');
      }
      throw err;
    }
  };

  const verify2FA = async (tempToken: string, code: string, trustDevice?: boolean) => {
    const response = await api.post('/auth/2fa/verify-login', { tempToken, code, trustDevice });
    const { token: newToken, user: newUser, trustedDeviceToken: newDeviceToken } = response.data;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    if (newDeviceToken) {
      localStorage.setItem('trusted_device_token', newDeviceToken);
    }
  };

  const logout = () => {
    if (token) {
      api.post('/auth/logout', {}).catch(err => console.error(err));
    }

    // 1. Clear all auth state from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('cached_user');
    localStorage.removeItem('read_notification_ids');
    localStorage.removeItem('trusted_device_token');

    // 2. Clear React state immediately so ProtectedRoute unloads
    setToken(null);
    setUser(null);
    setIsLoading(false);

    // 3. Navigate to login.
    //    In the packaged Electron app, ask the main process to do a full
    //    loadFile() to index.html#/login — this is the only reliable way
    //    to reset HashRouter state in a file:// context.
    if (typeof window !== 'undefined' && (window as any).electronAPI?.reloadToLogin) {
      (window as any).electronAPI.reloadToLogin();
      return;
    }

    // 4. Browser / dev fallback — React Router will pick up the hash change
    //    because ProtectedRoute will redirect unauthenticated users to /login.
    if (typeof window !== 'undefined') {
      window.location.hash = '/login';
    }
  };

  const refreshUser = async () => {
    if (token) {
      try {
        const response = await api.get('/auth/me');
        setUser(response.data);
      } catch (error) {
        console.error('Failed to refresh user context:', error);
      }
    }
  };

  const checkPermission = (permissionCode: string): boolean => {
    if (!user) return false;
    if (user.roles.includes('SUPER_ADMIN')) return true;
    return user.permissions.includes(permissionCode);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, verify2FA, logout, isAuthenticated: !!user, isLoading, checkPermission, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
