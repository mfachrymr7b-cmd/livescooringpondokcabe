import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl font-bold text-zinc-200">404</p>
      <h1 className="text-xl font-semibold text-zinc-900">Halaman tidak ditemukan</h1>
      <p className="text-sm text-zinc-500">Halaman yang kamu cari tidak ada.</p>
      <Link to="/dashboard">
        <Button>Kembali ke Dashboard</Button>
      </Link>
    </div>
  );
}
