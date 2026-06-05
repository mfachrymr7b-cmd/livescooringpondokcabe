/**
 * SessionChecker — dijalankan sekali saat app mount.
 * Memeriksa apakah access token masih valid; jika tidak, coba refresh.
 * Mengisi useAuthStore dengan status yang benar sebelum render routes.
 */
import { useEffect } from "react";
import { authService } from "@/services/auth";
import { useAuthStore } from "@/store/authStore";

interface Props {
  children: React.ReactNode;
}

export function SessionChecker({ children }: Props) {
  const { status, setLoading, setAuthenticated, setUnauthenticated } = useAuthStore();

  useEffect(() => {
    async function checkSession() {
      const accessToken = authService.getAccessToken();
      const refreshToken = authService.getRefreshToken();
      const expiresAt = Number(localStorage.getItem("tokenExpiresAt") ?? 0);

      // Tidak ada token sama sekali
      if (!accessToken) {
        setUnauthenticated();
        return;
      }

      const now = Date.now();
      const isExpired = expiresAt > 0 && now >= expiresAt - 60_000; // 1 menit buffer

      // Timeout 8 detik agar tidak stuck loading selamanya
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Session check timeout")), 8_000)
      );

      try {
        if (isExpired && refreshToken) {
          // Token expired — coba refresh
          const tokens = await Promise.race([
            authService.refresh(refreshToken),
            timeout,
          ]);
          const user = await authService.me();
          setAuthenticated(user, tokens);
        } else {
          // Token masih valid — ambil data user
          const user = await Promise.race([authService.me(), timeout]);
          setAuthenticated(user, {
            accessToken: accessToken!,
            refreshToken: refreshToken ?? "",
            expiresAt,
          });
        }
      } catch {
        // Token tidak valid / refresh gagal / timeout
        setUnauthenticated();
      }
    }

    if (status === "idle") {
      setLoading();
      checkSession();
    }
  }, [status, setLoading, setAuthenticated, setUnauthenticated]);

  return <>{children}</>;
}
