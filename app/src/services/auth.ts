/**
 * Auth service — wrapper untuk Convex HTTP auth endpoints.
 * Semua fetch ke /api/auth/* ada di sini.
 */

const BASE_URL = import.meta.env.VITE_CONVEX_URL.replace(".cloud", ".site");

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  displayName?: string;
  role: string;
  clubId?: string;
  avatarUrl?: string;
}

export interface LoginResponse extends AuthTokens {
  user: AuthUser;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request gagal");
  return data as T;
}

async function postAuth<T>(path: string, body: unknown): Promise<T> {
  const token = localStorage.getItem("accessToken") ?? "";
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request gagal");
  return data as T;
}

export const authService = {
  login: (email: string, password: string) =>
    post<LoginResponse>("/api/auth/login", { email, password }),

  register: (name: string, email: string, password: string) =>
    post<LoginResponse>("/api/auth/register", { name, email, password }),

  logout: (refreshToken?: string) =>
    postAuth<{ success: boolean }>("/api/auth/logout", { refreshToken }),

  logoutAll: () =>
    postAuth<{ success: boolean }>("/api/auth/logout-all", {}),

  refresh: (refreshToken: string) =>
    post<AuthTokens>("/api/auth/refresh", { refreshToken }),

  forgotPassword: (email: string) =>
    post<{ success: boolean; message: string }>("/api/auth/forgot-password", { email }),

  resetPassword: (token: string, newPassword: string) =>
    post<{ success: boolean; message: string }>("/api/auth/reset-password", {
      token,
      newPassword,
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    postAuth<{ success: boolean; message: string }>("/api/auth/change-password", {
      currentPassword,
      newPassword,
    }),

  /** Ambil data user yang sedang login dari server */
  me: () => {
    const token = localStorage.getItem("accessToken") ?? "";
    return fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unauthorized");
      return data as AuthUser;
    });
  },

  saveTokens(tokens: AuthTokens) {
    localStorage.setItem("accessToken", tokens.accessToken);
    localStorage.setItem("refreshToken", tokens.refreshToken);
    localStorage.setItem("tokenExpiresAt", String(tokens.expiresAt));
  },

  clearTokens() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("tokenExpiresAt");
  },

  getAccessToken: () => localStorage.getItem("accessToken"),
  getRefreshToken: () => localStorage.getItem("refreshToken"),
  isLoggedIn: () => Boolean(localStorage.getItem("accessToken")),
};
