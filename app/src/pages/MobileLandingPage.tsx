/**
 * MobileLandingPage — halaman yang muncul ketika user mobile
 * mencoba mengakses halaman selain scorecard.
 *
 * Menampilkan instruksi untuk mengakses scorecard langsung
 * melalui link yang dibagikan admin.
 */
import { Flag, Smartphone, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

export function MobileLandingPage() {
  const { user } = useAuthStore();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-700 shadow-lg">
          <Flag className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-black text-white">Pondokcabe Golf Club</h1>
        <p className="text-sm text-zinc-400">Live Golf Scoring</p>
      </div>

      {/* Mobile notice card */}
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
        <div className="mb-4 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
            <Smartphone className="h-6 w-6 text-emerald-400" />
          </div>
        </div>

        <h2 className="mb-2 text-lg font-bold text-white">Akses Mobile</h2>
        <p className="mb-6 text-sm text-zinc-400 leading-relaxed">
          Halaman admin hanya tersedia di desktop. Di perangkat mobile, kamu bisa mengakses{" "}
          <span className="font-semibold text-emerald-400">scorecard scoring</span> melalui link yang dibagikan oleh admin turnamen.
        </p>

        {/* Show scorecard link if authenticated */}
        {user ? (
          <div className="space-y-3">
            <Link
              to="/scorecards"
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-600 transition-colors"
            >
              <Flag className="h-4 w-4" />
              Lihat Scorecard Saya
            </Link>
            <p className="text-xs text-zinc-600">
              Login sebagai: <span className="text-zinc-400">{user.name}</span>
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-600 transition-colors"
            >
              Login untuk Scoring
            </Link>
          </div>
        )}
      </div>

      {/* Info boxes */}
      <div className="mt-8 w-full max-w-sm space-y-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-left">
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-wide mb-1">Untuk Player</p>
          <p className="text-sm text-zinc-300">
            Buka link scorecard yang dikirimkan admin, lalu masuk dan input skor per hole.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-left">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-1">Untuk Admin</p>
          <p className="text-sm text-zinc-500">
            Gunakan laptop atau desktop untuk mengakses panel admin turnamen.
          </p>
        </div>
        <a
          href="/live"
          className="flex items-center justify-center gap-2 w-full rounded-xl border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          Lihat Live Leaderboard
        </a>
      </div>

      <p className="mt-8 text-xs text-zinc-700">
        © Pondokcabe Golf Club · Powered by Convex
      </p>
    </div>
  );
}
