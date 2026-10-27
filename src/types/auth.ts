export interface AuthUser {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  role: 'ADMIN' | 'USER';
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  user?: AuthUser;
  token?: string;
  error?: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  serverUrl: string;
}
