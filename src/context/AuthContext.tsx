import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser } from '../types/auth';
import { apiLogin, apiGetMe } from '../api/auth';
import {
  getStoredToken,
  getStoredUser,
  setStoredAuth,
  clearStoredAuth,
  getStoredServerUrl,
  setStoredServerUrl,
} from '../api/config';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  serverUrl: string;
  updateServerUrl: (url: string) => Promise<void>;
  login: (identifier: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  serverUrl: '',
  updateServerUrl: async () => {},
  login: async () => ({ success: false }),
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [serverUrl, setServerUrl] = useState<string>('');

  // Khôi phục session khi mở app
  useEffect(() => {
    async function restoreSession() {
      try {
        const storedUrl = await getStoredServerUrl();
        setServerUrl(storedUrl);

        const storedToken = await getStoredToken();
        const storedUser = await getStoredUser();

        if (storedToken && storedUser) {
          setUser(storedUser);
          setToken(storedToken);

          // Kiểm tra ngầm lại token còn hợp lệ với server hay không
          apiGetMe(storedToken).then((res) => {
            if (res.success && res.user) {
              setUser(res.user);
            } else if (res.success === false) {
              // Phiên hết hạn
              clearStoredAuth();
              setUser(null);
              setToken(null);
            }
          }).catch(() => {
            // Giữ lại session offline nếu tạm mất mạng
          });
        }
      } catch (err) {
        console.error('Lỗi khôi phục session:', err);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  const updateServerUrl = async (newUrl: string) => {
    await setStoredServerUrl(newUrl);
    setServerUrl(newUrl.trim().replace(/\/+$/, ''));
  };

  const login = async (identifier: string, password: string): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    try {
      const res = await apiLogin(identifier, password);
      if (res.success && res.user && res.token) {
        setUser(res.user);
        setToken(res.token);
        await setStoredAuth(res.token, res.user);
        return { success: true, message: res.message || 'Đăng nhập thành công' };
      }
      return {
        success: false,
        message: res.message || res.error || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Có lỗi xảy ra trong quá trình đăng nhập.',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await clearStoredAuth();
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        serverUrl,
        updateServerUrl,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
