/**
 * AuthLoadingScreen — ditampilkan saat SessionChecker sedang memverifikasi sesi.
 */
import { Flag } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

export function AuthLoadingScreen() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white"
      role="status"
      aria-label="Memuat sesi..."
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-700 shadow-lg">
        <Flag className="h-7 w-7 text-white" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <Spinner size="md" className="text-green-700" />
        <p className="text-sm text-zinc-500">Memuat sesi...</p>
      </div>
    </div>
  );
}
