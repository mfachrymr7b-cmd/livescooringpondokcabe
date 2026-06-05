/**
 * LiveCommentPage — Halaman publik untuk penonton mengirim komentar ke TV mode.
 * Tidak butuh login. Akses via: /live/:tournamentId/comment
 */

import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/modules/convex/api";
import type { Id } from "@/modules/convex/dataModel";
import { MessageCircle, Send, Trophy, CheckCircle, ArrowLeft } from "lucide-react";
import { cn } from "@/utils";

export function LiveCommentPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const id = tournamentId ? (tournamentId as Id<"tournaments">) : undefined;

  const tournament = useQuery(api.queries.tournaments.get, id ? { id } : "skip");
  const submitComment = useMutation(api.mutations.broadcast_comments.submit);

  const [name, setName] = useState(() => localStorage.getItem("comment_name") ?? "");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;
    if (!id) {
      setErrorMsg("Turnamen tidak valid");
      setStatus("error");
      return;
    }

    setStatus("sending");
    setErrorMsg("");
    try {
      await submitComment({
        tournamentId: id,
        authorName: name.trim(),
        message: message.trim(),
        autoApprove: false,
      });
      localStorage.setItem("comment_name", name.trim());
      setMessage("");
      setStatus("sent");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal mengirim komentar");
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{ background: "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)" }}
    >
      {/* Card */}
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 mb-4">
            <MessageCircle className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Kirim Komentar</h1>
          {tournament && (
            <p className="text-emerald-300 mt-1 text-sm flex items-center justify-center gap-1.5">
              <Trophy className="h-3.5 w-3.5" />
              {tournament.name}
            </p>
          )}
          <p className="text-emerald-400 text-xs mt-2">
            Komentar akan ditampilkan di layar TV setelah disetujui
          </p>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-emerald-600/40 bg-white/5 backdrop-blur-sm p-6 shadow-xl">
          {status === "sent" ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20">
                <CheckCircle className="h-8 w-8 text-emerald-400" />
              </div>
              <p className="text-lg font-semibold text-white">Komentar Terkirim!</p>
              <p className="text-sm text-emerald-300">
                Komentar kamu sedang menunggu persetujuan admin untuk ditampilkan di layar TV.
              </p>
              <button
                onClick={() => setStatus("idle")}
                className="mt-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
              >
                Kirim Lagi
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nama */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-emerald-200">
                  Nama Kamu
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masukkan nama..."
                  maxLength={50}
                  required
                  className="w-full rounded-xl border border-emerald-600/50 bg-emerald-900/50 px-4 py-3 text-white placeholder-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                />
              </div>

              {/* Pesan */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-emerald-200">
                  Komentar
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tulis komentar atau dukungan untuk pemain..."
                  maxLength={200}
                  required
                  rows={4}
                  className="w-full rounded-xl border border-emerald-600/50 bg-emerald-900/50 px-4 py-3 text-white placeholder-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm resize-none"
                />
                <p className="text-xs text-emerald-500 text-right">
                  {message.length}/200
                </p>
              </div>

              {/* Error */}
              {status === "error" && (
                <div className="rounded-lg border border-red-500/40 bg-red-900/30 px-3 py-2 text-sm text-red-300">
                  {errorMsg}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={status === "sending" || !name.trim() || !message.trim()}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all",
                  status === "sending"
                    ? "bg-emerald-700 text-emerald-300 cursor-not-allowed"
                    : "bg-emerald-500 text-white hover:bg-emerald-400 active:scale-95"
                )}
              >
                <Send className="h-4 w-4" />
                {status === "sending" ? "Mengirim..." : "Kirim Komentar"}
              </button>
            </form>
          )}
        </div>

        {/* Back link */}
        <div className="text-center mt-6">
          <Link
            to={`/live/${tournamentId}`}
            className="inline-flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Lihat Leaderboard
          </Link>
        </div>
      </div>
    </div>
  );
}
