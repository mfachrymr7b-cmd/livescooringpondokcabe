/**
 * MobileGuard — jika diakses dari perangkat mobile, hanya boleh
 * mengakses /scorecards/:id dan /login.
 * Semua route lain diarahkan ke halaman MobileLanding.
 */
import { Navigate, Outlet, useLocation } from "react-router-dom";

function isMobileDevice(): boolean {
  // Cek lebar layar (< 768px = mobile)
  if (typeof window !== "undefined" && window.innerWidth < 768) return true;
  // Cek user agent sebagai fallback
  if (typeof navigator !== "undefined") {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }
  return false;
}

/** Route yang boleh diakses mobile selain /scorecards/:id */
const MOBILE_ALLOWED_PATTERNS = [
  /^\/login$/,
  /^\/register$/,
  /^\/scorecards\/[^/]+$/,   // /scorecards/:id
];

export function MobileGuard() {
  const location = useLocation();

  if (!isMobileDevice()) {
    // Desktop — lanjutkan normal
    return <Outlet />;
  }

  // Cek apakah route ini diizinkan di mobile
  const isAllowed = MOBILE_ALLOWED_PATTERNS.some((pattern) =>
    pattern.test(location.pathname)
  );

  if (isAllowed) {
    return <Outlet />;
  }

  // Redirect ke halaman mobile landing
  return <Navigate to="/mobile" replace />;
}
