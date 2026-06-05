import { ConvexProvider as BaseConvexProvider } from "convex/react";
import { useEffect } from "react";
import { convex } from "@/modules/convex/client";
import { useAuthStore } from "@/store/authStore";

interface Props {
  children: React.ReactNode;
}

// Set token immediately on module load so mutations that fire before
// the first useEffect cycle already have the token available.
const _initialToken = localStorage.getItem("accessToken");
if (_initialToken) {
  convex.setAuth(async () => localStorage.getItem("accessToken"));
}

/**
 * Sync token ke Convex client tanpa menahan queries.
 * Queries berjalan langsung — tidak menunggu auth selesai.
 * Token di-set saat status authenticated agar mutations yang butuh auth bisa berjalan.
 */
function ConvexAuthSync() {
  const { status } = useAuthStore();

  useEffect(() => {
    if (status === "authenticated") {
      const token = localStorage.getItem("accessToken");
      if (token) {
        convex.setAuth(async () => localStorage.getItem("accessToken"));
      }
    } else if (status === "unauthenticated") {
      convex.clearAuth();
    }
    // "idle" dan "loading": biarkan — queries tetap jalan tanpa token
  }, [status]);

  return null;
}

export function ConvexProvider({ children }: Props) {
  return (
    <BaseConvexProvider client={convex}>
      <ConvexAuthSync />
      {children}
    </BaseConvexProvider>
  );
}
