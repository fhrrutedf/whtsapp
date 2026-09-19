import { create } from 'zustand';

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
}

export interface TenantDTO {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

interface AuthState {
  user: UserDTO | null;
  tenant: TenantDTO | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  register: (data: {
    tenantName: string;
    adminName: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  clearError: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tenant: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('omni_auth_token') : null,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تسجيل الدخول، تحقق من البيانات');
      }

      const { token, user, tenant } = data;
      if (typeof window !== 'undefined') {
        localStorage.setItem('omni_auth_token', token);
        localStorage.setItem('omni_user_data', JSON.stringify(user));
        if (tenant) {
          localStorage.setItem('omni_tenant_data', JSON.stringify(tenant));
        }
      }

      set({ token, user, tenant: tenant || null, isLoading: false, error: null });
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  register: async (registerData) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل إنشاء الحساب، يرجى المحاولة لاحقاً');
      }

      const { token, user, tenant } = data;
      if (typeof window !== 'undefined') {
        localStorage.setItem('omni_auth_token', token);
        localStorage.setItem('omni_user_data', JSON.stringify(user));
        if (tenant) {
          localStorage.setItem('omni_tenant_data', JSON.stringify(tenant));
        }
      }

      set({ token, user, tenant: tenant || null, isLoading: false, error: null });
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('omni_auth_token');
      localStorage.removeItem('omni_user_data');
      localStorage.removeItem('omni_tenant_data');
    }
    set({ token: null, user: null, tenant: null, error: null });
  },

  checkAuth: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('omni_auth_token') : null;
    if (!token) {
      set({ user: null, tenant: null, token: null });
      return false;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        get().logout();
        return false;
      }
      const data = await res.json();
      set({ user: data.user, tenant: data.user?.tenant || null, token });
      return true;
    } catch {
      // Offline / network fallback: use cached user data
      if (typeof window !== 'undefined') {
        const cachedUser = localStorage.getItem('omni_user_data');
        const cachedTenant = localStorage.getItem('omni_tenant_data');
        if (cachedUser) {
          set({
            user: JSON.parse(cachedUser),
            tenant: cachedTenant ? JSON.parse(cachedTenant) : null,
            token,
          });
          return true;
        }
      }
      return false;
    }
  },
}));
