/**
 * useAuth — hook untuk login, register, logout, forgot password.
 * Semua state session tersimpan di useAuthStore.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "@/services/auth";
import { useAuthStore } from "@/store/authStore";

export function useAuth() {
  const navigate = useNavigate();
  const { user, status, setAuthenticated, setUnauthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [successMessage, setSuccessMessage] = useState<string | undefined>();

  async function login(email: string, password: string) {
    setError(undefined);
    setIsLoading(true);
    try {
      const res = await authService.login(email, password);
      setAuthenticated(res.user, res);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setIsLoading(false);
    }
  }

  async function register(name: string, email: string, password: string) {
    setError(undefined);
    setIsLoading(true);
    try {
      const res = await authService.register(name, email, password);
      setAuthenticated(res.user, res);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registrasi gagal");
    } finally {
      setIsLoading(false);
    }
  }

  async function logout() {
    setIsLoading(true);
    try {
      const refreshToken = authService.getRefreshToken() ?? undefined;
      await authService.logout(refreshToken);
    } finally {
      setUnauthenticated();
      setIsLoading(false);
      navigate("/login", { replace: true });
    }
  }

  async function forgotPassword(email: string) {
    setError(undefined);
    setSuccessMessage(undefined);
    setIsLoading(true);
    try {
      const res = await authService.forgotPassword(email);
      setSuccessMessage(res.message ?? "Link reset password telah dikirim ke email kamu.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim email reset");
    } finally {
      setIsLoading(false);
    }
  }

  return {
    user,
    status,
    isLoading,
    error,
    successMessage,
    isAuthenticated: status === "authenticated",
    login,
    register,
    logout,
    forgotPassword,
  };
}
