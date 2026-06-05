/**
 * GuestRoute — redirect ke /dashboard jika user sudah terautentikasi.
 * Dipakai untuk halaman login, register, forgot-password.
 */
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { AuthLoadingScreen } from "./AuthLoadingScreen";

export function GuestRoute() {
  const { status } = useAuthStore();

  if (status === "idle" || status === "loading") {
    return <AuthLoadingScreen />;
  }

  if (status === "authenticated") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
