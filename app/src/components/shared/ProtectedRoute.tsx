/**
 * ProtectedRoute — redirect ke /login jika belum terautentikasi.
 * Tampilkan AuthLoadingScreen selama sesi sedang dicek.
 */
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { AuthLoadingScreen } from "./AuthLoadingScreen";

export function ProtectedRoute() {
  const { status } = useAuthStore();
  const location = useLocation();

  if (status === "idle" || status === "loading") {
    return <AuthLoadingScreen />;
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
