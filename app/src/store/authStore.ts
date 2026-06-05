/**
 * Auth store — global session state menggunakan Zustand.
 * Satu-satunya sumber kebenaran untuk user yang sedang login.
 */
import { create } from "zustand";
import type { AuthUser, AuthTokens } from "@/services/auth";

export type SessionStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  user: AuthUser | null;
  status: SessionStatus;

  // Actions
  setLoading: () => void;
  setAuthenticated: (user: AuthUser, tokens: AuthTokens) => void;
  setUnauthenticated: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "idle",

  setLoading: () => set({ status: "loading" }),

  setAuthenticated: (user, tokens) => {
    localStorage.setItem("accessToken", tokens.accessToken);
    localStorage.setItem("refreshToken", tokens.refreshToken);
    localStorage.setItem("tokenExpiresAt", String(tokens.expiresAt));
    set({ user, status: "authenticated" });
  },

  setUnauthenticated: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("tokenExpiresAt");
    set({ user: null, status: "unauthenticated" });
  },
}));
