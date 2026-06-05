/**
 * ScorecardsListPage — Daftar scorecard semua peserta per ronde.
 *
 * Fitur:
 * - Pilih round/match dari turnamen
 * - Lihat semua peserta + status scorecard mereka
 * - Buat scorecard baru untuk peserta yang belum punya
 * - Klik "Input Skor" untuk langsung ke ScorecardPage
 * - Progress bar pengisian skor per ronde
 * - Skor live (totalStrokes, scoreToPar, holesRecorded) per peserta
 *
 * Route: /tournaments/:tournamentId/scorecards
 */

import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Edit3,
  Flag,
  Loader2,
  PlusCircle,
  Search,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import { api } from "@/modules/convex/api";
import type { Id } from "@/modules/convex/dataModel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { PageSpinner } from "@/components/ui/Spinner";
import { cn } from "@/utils";
import { calcTournamentHandicap } from "@/utils/handicap";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(ts: number) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

function fmtScoreToPar(v: number | undefined): string {
  if (v === undefined || v === null) return "—";
  if (v === 0) return "E";
  return v > 0 ? `+${v}` : String(v);
}

function scoreToParClass(v: number | undefined) {
  if (v === undefined) return "text-emerald-400";
  if (v < 0) return "text-red-400 font-bold";
  if (v > 0) return "text-blue-400 font-bold";
  return "text-white font-semibold";
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function ScorecardStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    in_progress: { label: "Sedang Diisi", className: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
    submitted:   { label: "Submitted",    className: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
    verified:    { label: "Verified",     className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
    disputed:    { label: "Disputed",     className: "bg-red-500/20 text-red-300 border-red-500/40" },
  };
  const cfg = map[status] ?? { label: status, className: "bg-white/10 text-emerald-200 border-white/20" };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold", cfg.className)}>
      {cfg.label}
    </span>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-emerald-300">
        <span>{label}</span>
        <span className="font-semibold text-white">{value}/{max} ({pct}%)</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-900/60">
        <div
          className="h-full rounded-full bg-emerald-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Scorecard row ────────────────────────────────────────────────────────────

type ScorecardRow = {
  _id: string;
  playerId: string;
  status: string;
  totalStrokes?: number;
  totalNetScore?: number;
  scoreToPar?: number;
  playingHandicap?: number;
  player: {
    _id: string;
    displayName: string;
    bibNumber?: string;
    handicapIndex?: number;
    status: string;
  } | null;
  tournament?: {
    _id: string;
    name: string;
    holesPerRound: number;
  } | null;
};

function ScorecardRowItem({
  row,
  holesPerRound,
  onInput,
}: {
  row: ScorecardRow;
  holesPerRound: number;
  onInput: () => void;
}) {
  const liveData = useQuery(api.subscriptions.scorecards.liveHoles, {
    scorecardId: row._id as Id<"scorecards">,
  });

  const holesRecorded = liveData?.holesRecorded ?? 0;
  const totalStrokes = liveData?.totalStrokes ?? row.totalStrokes;
  const scoreToPar = liveData?.scoreToPar ?? row.scoreToPar;
  const isComplete = holesRecorded >= holesPerRound;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-emerald-600/40 bg-emerald-800/40 px-4 py-3 transition-colors hover:border-emerald-400/60 hover:bg-emerald-700/40">
      {/* Bib + Name */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {row.player?.bibNumber && (
          <span className="shrink-0 rounded bg-emerald-700 px-1.5 py-0.5 text-xs font-bold text-emerald-100">
            #{row.player.bibNumber}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{row.player?.displayName ?? "—"}</p>
          <p className="text-xs text-emerald-400">
            HCP {row.player?.handicapIndex ?? "—"}
            {row.playingHandicap !== undefined ? ` · Playing HCP ${row.playingHandicap}` : ""}
          </p>
        </div>
      </div>

      {/* Holes progress */}
      <div className="hidden w-20 sm:block">
        <p className="text-center text-xs text-emerald-400">Holes</p>
        <p className={cn("text-center text-sm font-bold tabular-nums", isComplete ? "text-emerald-300" : "text-white")}>
          {holesRecorded}/{holesPerRound}
          {isComplete && <CheckCircle2 className="ml-1 inline h-3.5 w-3.5 text-emerald-400" />}
        </p>
      </div>

      {/* Score */}
      <div className="hidden w-16 sm:block">
        <p className="text-center text-xs text-emerald-400">Gross</p>
        <p className="text-center text-sm font-bold tabular-nums text-white">{totalStrokes ?? "—"}</p>
      </div>

      {/* To Par */}
      <div className="hidden w-14 sm:block">
        <p className="text-center text-xs text-emerald-400">+/-</p>
        <p className={cn("text-center text-sm tabular-nums", scoreToParClass(scoreToPar))}>
          {fmtScoreToPar(scoreToPar)}
        </p>
      </div>

      {/* Status */}
      <div className="hidden md:block">
        <ScorecardStatusBadge status={row.status} />
      </div>

      {/* Action */}
      <Button
        size="sm"
        variant={row.status === "verified" ? "outline" : "default"}
        onClick={onInput}
        className="shrink-0"
      >
        <Edit3 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">
          {row.status === "verified" ? "Lihat" : "Input Skor"}
        </span>
      </Button>
    </div>
  );
}

// ─── Player without scorecard row ─────────────────────────────────────────────

type PlayerRow = {
  _id: string;
  displayName: string;
  bibNumber?: string;
  handicapIndex?: number;
  status: string;
};

function PlayerWithoutScorecardRow({
  player,
  isCreating,
  onCreate,
}: {
  player: PlayerRow;
  isCreating: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-dashed border-emerald-600/40 bg-emerald-900/20 px-4 py-3 transition-colors hover:border-emerald-500/60 hover:bg-emerald-800/30">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {player.bibNumber && (
          <span className="shrink-0 rounded bg-emerald-900/60 px-1.5 py-0.5 text-xs font-bold text-emerald-400">
            #{player.bibNumber}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold text-emerald-200">{player.displayName}</p>
          <p className="text-xs text-emerald-400">HCP {player.handicapIndex ?? "—"} · Belum ada scorecard</p>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        loading={isCreating}
        onClick={onCreate}
        className="shrink-0"
      >
        <PlusCircle className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Buat Scorecard</span>
      </Button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ScorecardsListPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const id = tournamentId ? (tournamentId as Id<"tournaments">) : undefined;
  const navigate = useNavigate();

  const [selectedMatchId, setSelectedMatchId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tournament = useQuery(api.queries.tournaments.get, id ? { id } : "skip");
  const matches = useQuery(api.queries.tournaments.getMatches, id ? { tournamentId: id } : "skip");
  const course = useQuery(
    api.queries.golf_courses.get,
    tournament ? { id: tournament.courseId as Id<"golf_courses"> } : "skip"
  );

  // Auto-select first match
  const selectedMatch = useMemo(() => {
    if (!matches) return null;
    if (selectedMatchId) return matches.find((m) => m._id === selectedMatchId) ?? null;
    return matches[0] ?? null;
  }, [matches, selectedMatchId]);

  const roundNumber = selectedMatch?.roundNumber ?? 1;

  const scorecards = useQuery(
    api.queries.scorecards.listByTournamentAndRound,
    tournament ? { tournamentId: id as Id<"tournaments">, roundNumber } : "skip"
  );

  const playersWithout = useQuery(
    api.queries.scorecards.playersWithoutScorecard,
    selectedMatch ? { tournamentId: id as Id<"tournaments">, matchId: selectedMatch._id as Id<"matches"> } : "skip"
  );

  const allScorecards = useQuery((api.queries.scorecards as any).listAll, { limit: 50 });
  const createScorecard = useMutation(api.mutations.scorecards.create);

  // Filter by search
  const filteredScorecards = useMemo(() => {
    if (!scorecards) return [];
    const q = search.toLowerCase();
    if (!q) return scorecards;
    return scorecards.filter(
      (sc) =>
        sc.player?.displayName.toLowerCase().includes(q) ||
        sc.player?.bibNumber?.toLowerCase().includes(q)
    );
  }, [scorecards, search]);

  const filteredWithout = useMemo(() => {
    if (!playersWithout) return [];
    const q = search.toLowerCase();
    if (!q) return playersWithout;
    return playersWithout.filter(
      (p) => p.displayName.toLowerCase().includes(q) || p.bibNumber?.toLowerCase().includes(q)
    );
  }, [playersWithout, search]);

  const filteredAllScorecards = useMemo(() => {
    if (!allScorecards) return [];
    const q = search.toLowerCase();
    if (!q) return allScorecards;
    return allScorecards.filter(
      (sc: ScorecardRow) =>
        sc.player?.displayName.toLowerCase().includes(q) ||
        sc.player?.bibNumber?.toLowerCase().includes(q) ||
        sc.tournament?.name.toLowerCase().includes(q)
    );
  }, [allScorecards, search]);

  // Progress stats
  const stats = useMemo(() => {
    if (!scorecards) return null;
    const total = scorecards.length;
    const verified   = scorecards.filter((s) => s.status === "verified").length;
    const submitted  = scorecards.filter((s) => s.status === "submitted").length;
    const inProgress = scorecards.filter((s) => s.status === "in_progress").length;
    return { total, verified, submitted, inProgress };
  }, [scorecards]);

  async function handleCreateScorecard(player: PlayerRow) {
    if (!selectedMatch || !tournament || !course) return;
    setError(null);
    setCreatingFor(player._id);
    try {
      const hcpIndex = player.handicapIndex ?? 0;
      const playingHandicap = tournament.useHandicap
        ? calcTournamentHandicap({
            handicapIndex: hcpIndex,
            slopeRating: course.slopeRating ?? 113,
            courseRating: course.courseRating ?? course.par,
            par: course.par,
            format: tournament.format,
          }).playingHandicap
        : undefined;

      const scorecardId = await createScorecard({
        playerId: player._id as Id<"players">,
        tournamentId: id as Id<"tournaments">,
        matchId: selectedMatch._id as Id<"matches">,
        roundNumber: selectedMatch.roundNumber,
        playingHandicap,
      });
      navigate(`/scorecards/${scorecardId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat scorecard");
    } finally {
      setCreatingFor(null);
    }
  }

  if (!id) {
    if (allScorecards === undefined) return <PageSpinner />;
    return (
      <div className="space-y-6 p-6">
        <div className="rounded-3xl border border-emerald-500/40 bg-emerald-900/20 p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xl font-bold text-white">Semua Scorecard</p>
              <p className="mt-2 text-sm text-emerald-300">
                Nama peserta sudah otomatis tampil di scorecard. Pilih scorecard untuk langsung input skor.
              </p>
            </div>
            <Button asChild variant="secondary" size="sm">
              <Link to="/tournaments">Pilih Turnamen</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-950/50 p-4">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama peserta atau turnamen"
          />
        </div>

        {filteredAllScorecards.length === 0 ? (
          <div className="rounded-3xl border border-emerald-500/20 bg-amber-900/20 p-8 text-center text-amber-200">
            Tidak ada scorecard yang cocok.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAllScorecards.map((row: ScorecardRow) => (
              <ScorecardRowItem
                key={row._id}
                row={row}
                holesPerRound={row.tournament?.holesPerRound ?? 18}
                onInput={() => navigate(`/scorecards/${row._id}`)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (tournament === undefined || matches === undefined) return <PageSpinner />;
  if (!tournament) return <p className="text-emerald-300">Turnamen tidak ditemukan</p>;

  const holesPerRound = tournament.holesPerRound;
  const totalPlayers = (scorecards?.length ?? 0) + (playersWithout?.length ?? 0);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link to={`/tournaments/${tournamentId}`} aria-label="Kembali ke turnamen">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-white">Scorecard Peserta</h1>
            <Badge variant="secondary">{tournament.name}</Badge>
          </div>
          <p className="mt-1 text-sm text-emerald-300">
            Input skor per peserta · skor langsung masuk ke live leaderboard
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to={`/live/${tournamentId}`} target="_blank">
            <Trophy className="h-3.5 w-3.5" />
            Live Leaderboard
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-900/30 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* ── Match selector ── */}
      {matches.length === 0 ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-900/20 px-4 py-5 text-center">
          <Flag className="mx-auto mb-2 h-8 w-8 text-amber-400" />
          <p className="font-semibold text-amber-200">Belum ada round/match</p>
          <p className="mt-1 text-sm text-amber-300/80">
            Buat round terlebih dahulu di halaman detail turnamen.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link to={`/tournaments/${tournamentId}`}>Ke Halaman Turnamen</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {matches.map((match) => {
            const isSelected =
              selectedMatchId === match._id ||
              (!selectedMatchId && match._id === matches[0]?._id);
            return (
              <button
                key={match._id}
                onClick={() => setSelectedMatchId(match._id)}
                className={cn(
                  "rounded-lg border px-4 py-2 text-sm font-semibold transition-all",
                  isSelected
                    ? "border-emerald-400 bg-emerald-500/30 text-white shadow-sm"
                    : "border-emerald-700/50 bg-emerald-800/30 text-emerald-200 hover:border-emerald-500 hover:bg-emerald-700/40"
                )}
              >
                Round {match.roundNumber}
                {match.flightName ? ` · ${match.flightName}` : ""}
                <span
                  className={cn(
                    "ml-2 rounded-full px-1.5 py-0.5 text-xs",
                    isSelected ? "bg-emerald-400/30 text-white" : "bg-emerald-900/60 text-emerald-400"
                  )}
                >
                  {match.status}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {selectedMatch && (
        <>
          {/* ── Match info + progress ── */}
          <div className="rounded-xl border border-emerald-600/40 bg-emerald-800/30 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-white">
                  Round {selectedMatch.roundNumber}
                  {selectedMatch.flightName ? ` · ${selectedMatch.flightName}` : ""}
                </p>
                <p className="text-xs text-emerald-400">
                  {fmtDate(selectedMatch.scheduledDate)} · Hole {selectedMatch.startingHole} · {selectedMatch.holesPlayed} holes
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm text-emerald-300">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {totalPlayers} peserta
                </span>
                {stats && (
                  <>
                    <span className="flex items-center gap-1 text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" />
                      {stats.verified} verified
                    </span>
                    <span className="flex items-center gap-1 text-amber-300">
                      <Clock className="h-4 w-4" />
                      {stats.inProgress} in progress
                    </span>
                  </>
                )}
              </div>
            </div>

            {stats && stats.total > 0 && (
              <div className="space-y-2">
                <ProgressBar
                  value={stats.verified + stats.submitted}
                  max={stats.total}
                  label="Scorecard selesai (submitted + verified)"
                />
                <ProgressBar
                  value={stats.verified}
                  max={stats.total}
                  label="Scorecard terverifikasi"
                />
              </div>
            )}
          </div>

          {/* ── Search ── */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
            <Input
              placeholder="Cari nama atau nomor peserta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* ── Scorecards list ── */}
          {scorecards === undefined ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Existing scorecards */}
              {filteredScorecards.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-400">
                    <ClipboardList className="h-3.5 w-3.5" />
                    Scorecard Aktif ({filteredScorecards.length})
                  </div>
                  {filteredScorecards.map((sc) => (
                    <ScorecardRowItem
                      key={sc._id}
                      row={sc as ScorecardRow}
                      holesPerRound={holesPerRound}
                      onInput={() => navigate(`/scorecards/${sc._id}`)}
                    />
                  ))}
                </div>
              )}

              {/* Players without scorecard */}
              {filteredWithout.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-400/70">
                    <XCircle className="h-3.5 w-3.5" />
                    Belum Ada Scorecard ({filteredWithout.length})
                  </div>
                  {filteredWithout.map((player) => (
                    <PlayerWithoutScorecardRow
                      key={player._id}
                      player={player as PlayerRow}
                      isCreating={creatingFor === player._id}
                      onCreate={() => handleCreateScorecard(player as PlayerRow)}
                    />
                  ))}
                </div>
              )}

              {/* Empty state */}
              {filteredScorecards.length === 0 && filteredWithout.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-emerald-700/50 bg-emerald-900/20 py-14 text-center">
                  <ClipboardList className="mb-3 h-10 w-10 text-emerald-600" />
                  <p className="font-medium text-emerald-200">
                    {search ? "Tidak ada peserta yang cocok" : "Belum ada peserta terdaftar"}
                  </p>
                  <p className="mt-1 text-sm text-emerald-400">
                    {search ? "Coba kata kunci lain" : "Daftarkan peserta di halaman detail turnamen"}
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
