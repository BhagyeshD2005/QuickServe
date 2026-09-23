import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { User } from '../types';
import authApi, { LoginPayload } from '../api/auth';
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY, getErrorMessage } from '../api/axios';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (credentials: LoginPayload) => Promise<User>;
  loginWithToken: (token: string) => Promise<User>;
  logout: () => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
  isAgent: () => boolean;
  getCurrentUser: () => User | null;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    if (!saved) return null;
    try {
      return JSON.parse(saved) as User;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setError(null);
  }, []);

  // Validate session on mount
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!storedToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const currentUser = await authApi.getMe();
        if (isMounted) {
          if (currentUser.role !== 'ADMIN' && currentUser.role !== 'AGENT') {
            logout();
            setError('Access denied — administrator or agent privileges required.');
          } else {
            setUser(currentUser);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser));
          }
        }
      } catch {
        if (isMounted) {
          logout();
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    verifySession();
    return () => {
      isMounted = false;
    };
  }, [logout]);

  const login = async (credentials: LoginPayload): Promise<User> => {
    setLoading(true);
    setError(null);
    try {
      const data = await authApi.login(credentials);
      
      // Verification of role: Allow both ADMIN and AGENT
      if (data.user.role !== 'ADMIN' && data.user.role !== 'AGENT') {
        throw new Error('Access denied — customer accounts cannot access the console. An admin must promote your account to AGENT first.');
      }

      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const loginWithToken = async (customToken: string): Promise<User> => {
    setLoading(true);
    setError(null);
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, customToken.trim());
      setToken(customToken.trim());
      const verifiedUser = await authApi.getMe();
      if (verifiedUser.role !== 'ADMIN' && verifiedUser.role !== 'AGENT') {
        logout();
        throw new Error('Access denied — the provided token does not belong to an administrator or service agent.');
      }
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(verifiedUser));
      setUser(verifiedUser);
      return verifiedUser;
    } catch (err) {
      logout();
      const msg = getErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async (): Promise<void> => {
    if (!token) return;
    try {
      const updatedUser = await authApi.getMe();
      if (updatedUser.role === 'ADMIN') {
        setUser(updatedUser);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
      } else {
        logout();
      }
    } catch {
      // Silently keep existing user state if temporary network error
    }
  };

  const isAuthenticated = useCallback((): boolean => {
    return Boolean(token && user);
  }, [token, user]);

  const isAdmin = useCallback((): boolean => {
    return user?.role === 'ADMIN';
  }, [user]);

  const isAgent = useCallback((): boolean => {
    return user?.role === 'AGENT';
  }, [user]);

  const getCurrentUser = useCallback((): User | null => {
    return user;
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        login,
        loginWithToken,
        logout,
        isAuthenticated,
        isAdmin,
        isAgent,
        getCurrentUser,
        refreshUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
