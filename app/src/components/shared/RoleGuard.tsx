/**
 * RoleGuard — redirect ke /dashboard jika role user tidak diizinkan.
 *
 * Contoh penggunaan:
 *   <Route element={<RoleGuard allowed={["super_admin", "club_admin"]} />}>
 *     <Route path="/admin/..." element={<AdminPage />} />
 *   </Route>
 */
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import type { UserRole } from "@/types";

interface RoleGuardProps {
  /** Daftar role yang diizinkan mengakses route ini */
  allowed: UserRole[];
  /** Redirect target jika role tidak diizinkan (default: /dashboard) */
  redirectTo?: string;
}

export function RoleGuard({ allowed, redirectTo = "/dashboard" }: RoleGuardProps) {
  const { user } = useAuthStore();

  if (!user || !allowed.includes(user.role as UserRole)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
