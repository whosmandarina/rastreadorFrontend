import { create } from 'zustand';
import { authService, AuthUser, LoginPayload, RegisterPayload } from '../services/auth.service';
import { saveToken, saveUser, getToken, getUser, clearAuth } from '../utils/storage';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,

  login: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authService.login(payload);
      await saveToken(data.token);
      await saveUser(data.user);
      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: any) {
      const msg =
        err.response?.data?.message || 'Error al iniciar sesión. Intenta de nuevo.';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  register: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await authService.register(payload);
      set({ isLoading: false });
    } catch (err: any) {
      const msg =
        err.response?.data?.message || 'Error al registrarse. Intenta de nuevo.';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
    } catch (_) {
      // ignore logout errors
    } finally {
      await clearAuth();
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      const [token, user] = await Promise.all([getToken(), getUser()]);
      if (token && user) {
        set({ token, user, isAuthenticated: true });
      }
    } catch (_) {
      await clearAuth();
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
