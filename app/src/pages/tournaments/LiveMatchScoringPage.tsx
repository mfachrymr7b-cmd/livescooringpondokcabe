/**
 * LiveMatchScoringPage — Halaman live scoring per match/flight.
 * Menampilkan skor hole-by-hole semua player dalam satu match,
 * mirip dengan tampilan scoring table di Flashscore.
 * Admin/scorer bisa input skor langsung dari halaman ini.
 */

import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import {
  Activity,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Pencil,
  Radio,
  Save,
  X,
} from "lucide-react";
import { api } from "@/modules/convex/api";
import type { Id } from "@/modules/convex/dataModel";
import { HoleByHoleGrid, type PlayerRow, type CourseHole } from "@/components/scoring/HoleByHoleGrid";
import { PageSpinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type HoleDraft = { strokes: string; putts: string; penaltyStrokes: string };
type ScoreDraft = Record<number, HoleDraft>;

type ScoringPlayer = {
  scorecardId: Id<"scorecards">;
  playerId: string;
  displayName: string;
  bibNumber?: string;
  playingHandicap?: number;
  holeScores: Array<{ holeNumber: number; strokes: number; putts?: number; penaltyStrokes?: number }>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatLabel: Record<string, string> = {
  stroke_play: "Stroke Play",
  match_play: "Match Play",
  stableford: "Stableford",
  scramble: "Scramble",
  best_ball: "Best Ball",
  skins: "Skins",
};

function formatDateTime(ts: number) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(ts));
}

function formatToPar(value: number | undefined): string {
  if (value === undefined) return "—";
  if (value === 0) return "E";
  return value > 0 ? `+${value}` : String(value);
}

// ─── StepperInput ─────────────────────────────────────────────────────────────

function StepperInput({
  value, onChange, min = 0, max = 20, label, id,
}: {
  value: string; onChange: (v: string) => void;
  min?: number; max?: number; label: string; id: string;
}) {
  const num = Number(value);
  const safeNum = Number.isFinite(num) ? num : min;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
        {label}
      </label>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`Kurangi ${label}`}
          onClick={() => onChange(String(Math.max(min, safeNum - 1)))}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 active:scale-95 transition-all"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 rounded-xl border border-zinc-300 bg-white text-center text-lg font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-green-500 tabular-nums"
        />
        <button
          type="button"
          aria-label={`Tambah ${label}`}
          onClick={() => onChange(String(Math.min(max, safeNum + 1)))}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 active:scale-95 transition-all"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── ScoreInputPanel ──────────────────────────────────────────────────────────

function ScoreInputPanel({
  player, courseHoles, onClose, onSaved,
}: {
  player: ScoringPlayer;
  courseHoles: CourseHole[];
  onClose: () => void;
  onSaved?: (holeNumber: number) => void;
}) {
  const recordHoleScore = useMutation(api.mutations.scorecards.recordHoleScore);
  const holeInfoList = useQuery(
    api.queries.golf_courses.getHolesByScorecardId,
    { scorecardId: player.scorecardId }
  );

  const sortedHoles = useMemo(
    () => [...courseHoles].sort((a, b) => a.holeNumber - b.holeNumber),
    [courseHoles]
  );

  const initialDraft = useMemo<ScoreDraft>(() => {
    const d: ScoreDraft = {};
    for (const h of player.holeScores) {
      d[h.holeNumber] = {
        strokes: String(h.strokes),
        putts: h.putts != null ? String(h.putts) : "",
        penaltyStrokes: h.penaltyStrokes != null ? String(h.penaltyStrokes) : "",
      };
    }
    return d;
  }, [player.holeScores]);

  const [draft, setDraft] = useState<ScoreDraft>(initialDraft);
  const [savingHole, setSavingHole] = useState<number | null>(null);
  const [savedSet, setSavedSet] = useState<Set<number>>(
    new Set(player.holeScores.map((h) => h.holeNumber))
  );
  const [error, setError] = useState<string | null>(null);
  const [activeHole, setActiveHole] = useState<number>(sortedHoles[0]?.holeNumber ?? 1);

  function updateDraft(holeNumber: number, key: keyof HoleDraft, value: string) {
    setDraft((prev) => ({
      ...prev,
      [holeNumber]: {
        strokes: prev[holeNumber]?.strokes ?? "",
        putts: prev[holeNumber]?.putts ?? "",
        penaltyStrokes: prev[holeNumber]?.penaltyStrokes ?? "",
        [key]: value,
      },
    }));
  }

  async function saveHole(holeNumber: number) {
    const holeInfo = holeInfoList?.find((h) => h.holeNumber === holeNumber);
    if (!holeInfo) { setError("Data hole tidak ditemukan. Pastikan course holes sudah diisi."); return; }

    const value = draft[holeNumber];
    const strokes = Number(value?.strokes);
    if (!Number.isFinite(strokes) || strokes <= 0) {
      setError(`Hole ${holeNumber}: strokes wajib diisi (> 0)`);
      return;
    }
    const putts = Number(value?.putts);
    const penalty = Number(value?.penaltyStrokes);

    setSavingHole(holeNumber);
    setError(null);
    try {
      await recordHoleScore({
        scorecardId: player.scorecardId,
        holeId: holeInfo._id as Id<"golf_holes">,
        holeNumber,
        strokes,
        putts: Number.isFinite(putts) && putts >= 0 ? putts : undefined,
        penaltyStrokes: Number.isFinite(penalty) && penalty >= 0 ? penalty : undefined,
      });
      setSavedSet((prev) => new Set([...prev, holeNumber]));
      onSaved?.(holeNumber);
      // Auto-advance
      const idx = sortedHoles.findIndex((h) => h.holeNumber === holeNumber);
      if (idx < sortedHoles.length - 1) setActiveHole(sortedHoles[idx + 1].holeNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan skor");
    } finally {
      setSavingHole(null);
    }
  }

  const currentHole = sortedHoles.find((h) => h.holeNumber === activeHole);
  const currentDraft = draft[activeHole] ?? { strokes: "", putts: "", penaltyStrokes: "" };
  const currentIdx = sortedHoles.findIndex((h) => h.holeNumber === activeHole);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < sortedHoles.length - 1;
  const strokesNum = Number(currentDraft.strokes);
  const scoreToPar = currentHole && strokesNum > 0 ? strokesNum - currentHole.par : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 flex-shrink-0">
          <div>
            <p className="font-bold text-zinc-900 text-base">{player.displayName}</p>
            <p className="text-xs text-zinc-500">
              {player.bibNumber ? `#${player.bibNumber}` : ""}
              {player.playingHandicap !== undefined ? `${player.bibNumber ? " · " : ""}HCP ${player.playingHandicap}` : ""}
            </p>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Hole tabs */}
        <div className="overflow-x-auto border-b border-zinc-200 bg-zinc-50 flex-shrink-0">
          <div className="flex gap-1.5 px-4 py-2.5 min-w-max">
            {sortedHoles.map((h) => {
              const isSaved = savedSet.has(h.holeNumber);
              const isActive = h.holeNumber === activeHole;
              return (
                <button
                  key={h.holeNumber}
                  onClick={() => setActiveHole(h.holeNumber)}
                  aria-pressed={isActive}
                  className={cn(
                    "relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-all",
                    isActive ? "bg-green-600 text-white shadow" :
                    isSaved ? "bg-green-100 text-green-700 hover:bg-green-200" :
                    "bg-white text-zinc-600 border border-zinc-200 hover:border-green-400 hover:text-green-700"
                  )}
                >
                  {h.holeNumber}
                  {isSaved && !isActive && (
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 border border-white" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active hole input */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {currentHole ? (
            <div className="space-y-5">
              {/* Hole info bar */}
              <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3">
                <div>
                  <p className="text-2xl font-black text-zinc-900">Hole {currentHole.holeNumber}</p>
                  <p className="text-sm text-zinc-500">Par {currentHole.par} · SI {currentHole.strokeIndex}</p>
                </div>
                {savedSet.has(currentHole.holeNumber) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Tersimpan
                  </span>
                )}
              </div>

              {/* Steppers */}
              <div className="flex justify-around gap-2">
                <StepperInput id={`s-${activeHole}`} label="Strokes" value={currentDraft.strokes}
                  onChange={(v) => updateDraft(activeHole, "strokes", v)} min={1} max={20} />
                <StepperInput id={`p-${activeHole}`} label="Putts" value={currentDraft.putts}
                  onChange={(v) => updateDraft(activeHole, "putts", v)} min={0} max={10} />
                <StepperInput id={`pen-${activeHole}`} label="Penalty" value={currentDraft.penaltyStrokes}
                  onChange={(v) => updateDraft(activeHole, "penaltyStrokes", v)} min={0} max={10} />
              </div>

              {/* Score preview */}
              {scoreToPar !== undefined && (
                <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <span className="text-sm text-zinc-500">Score to par</span>
                  <span className={cn("font-bold text-xl tabular-nums",
                    scoreToPar < 0 ? "text-red-600" : scoreToPar > 0 ? "text-blue-600" : "text-zinc-700"
                  )}>
                    {formatToPar(scoreToPar)}
                  </span>
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
              )}

              <Button
                className="w-full" size="lg"
                loading={savingHole === activeHole}
                disabled={!currentDraft.strokes || Number(currentDraft.strokes) <= 0}
                onClick={() => void saveHole(activeHole)}
              >
                <Save className="h-4 w-4" />
                Simpan Hole {currentHole.holeNumber}
              </Button>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-zinc-400">Pilih hole di atas</p>
          )}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between border-t border-zinc-200 px-5 py-3 flex-shrink-0">
          <Button variant="ghost" size="sm" disabled={!hasPrev}
            onClick={() => setActiveHole(sortedHoles[currentIdx - 1].holeNumber)}>
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <span className="text-xs text-zinc-400">{currentIdx + 1} / {sortedHoles.length}</span>
          <Button variant="ghost" size="sm" disabled={!hasNext}
            onClick={() => setActiveHole(sortedHoles[currentIdx + 1].holeNumber)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function LiveMatchScoringPage() {
  const { tournamentId, matchId } = useParams<{ tournamentId: string; matchId: string }>();
  const mId = matchId as Id<"matches">;
  const [showNet, setShowNet] = useState(false);
  const [scoringPlayer, setScoringPlayer] = useState<ScoringPlayer | null>(null);

  const data = useQuery(api.subscriptions.liveScoring.matchScoringGrid, { matchId: mId });

  if (data === undefined) return <PageSpinner />;

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="font-medium text-zinc-600">Match tidak ditemukan</p>
        <Link to={`/tournaments/${tournamentId}`} className="mt-3 text-sm text-green-700 hover:underline">
          ← Kembali ke turnamen
        </Link>
      </div>
    );
  }

  const isStableford = data.format === "stableford";
  const isMatchPlay = data.format === "match_play";
  const hasHandicap = data.players.some((p) => p.playingHandicap !== undefined);
  const courseHoles: CourseHole[] = data.courseHoles;

  const players: PlayerRow[] = data.players.map((p) => ({
    playerId: p.playerId,
    displayName: p.displayName,
    bibNumber: p.bibNumber,
    handicapIndex: p.handicapIndex,
    playingHandicap: p.playingHandicap,
    totalStrokes: p.totalStrokes,
    totalNetScore: p.totalNetScore,
    scoreToPar: p.scoreToPar,
    totalStablefordPoints: p.totalStablefordPoints,
    holesCompleted: p.holesCompleted,
    holeScores: p.holeScores,
  }));

  const statusColors: Record<string, string> = {
    ongoing: "bg-green-100 text-green-800 border-green-200",
    scheduled: "bg-blue-100 text-blue-800 border-blue-200",
    completed: "bg-zinc-100 text-zinc-700 border-zinc-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link to={`/tournaments/${tournamentId}`} aria-label="Kembali ke turnamen">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900">
                Live Scoring — Round {data.roundNumber}
                {data.flightName ? ` · ${data.flightName}` : ""}
              </h1>
              <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-bold",
                statusColors[data.status] ?? statusColors.scheduled)}>
                {data.status === "ongoing" && <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />}
                {data.status.replace("_", " ").toUpperCase()}
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              {data.tournamentName} · {formatLabel[data.format] ?? data.format} · {formatDateTime(data.scheduledDate)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {data.status === "ongoing" && (
            <Badge variant="blue" className="gap-1">
              <Radio className="h-3 w-3" /> Live
            </Badge>
          )}
          {hasHandicap && !isStableford && (
            <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
              <button onClick={() => setShowNet(false)}
                className={cn("rounded px-3 py-1.5 text-sm font-medium transition-all",
                  !showNet ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700")}>
                Gross
              </button>
              <button onClick={() => setShowNet(true)}
                className={cn("rounded px-3 py-1.5 text-sm font-medium transition-all",
                  showNet ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700")}>
                Net
              </button>
            </div>
          )}
          <Button asChild variant="outline" size="sm">
            <Link to={`/live/${tournamentId}`} target="_blank">
              <ExternalLink className="h-4 w-4" /> Public View
            </Link>
          </Button>
        </div>
      </div>

      {/* Live indicator */}
      {data.status === "ongoing" && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          <Activity className="h-4 w-4 animate-pulse" />
          Skor diperbarui secara real-time. Halaman ini akan otomatis refresh saat ada skor baru.
        </div>
      )}

      {/* Match play standings */}
      {isMatchPlay && data.players.some((p) => p.matchplayStanding) && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.players.map((p) => (
            <div key={p.playerId} className="rounded-lg border border-zinc-200 bg-white p-4">
              <p className="font-semibold text-zinc-900">{p.displayName}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-zinc-500">Match Standing</span>
                <span className={cn("font-bold text-lg",
                  p.matchOutcome === "won" ? "text-green-700" :
                  p.matchOutcome === "lost" ? "text-red-600" : "text-zinc-700")}>
                  {p.matchplayStanding ?? "—"}
                </span>
              </div>
              {p.isMatchWinner && <div className="mt-2"><Badge variant="default">Match Winner</Badge></div>}
            </div>
          ))}
        </div>
      )}

      {/* Player cards + Input Score */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.players.map((p) => {
          const toPar = p.scoreToPar;
          return (
            <div key={p.playerId} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm flex flex-col gap-3">
              <div>
                <p className="font-semibold text-zinc-900 truncate">{p.displayName}</p>
                {p.bibNumber && <p className="text-xs text-zinc-400">#{p.bibNumber}</p>}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-zinc-400">Holes</p>
                  <p className="font-bold text-zinc-900">{p.holesCompleted}/{data.holesPlayed}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">{isStableford ? "Pts" : "Score"}</p>
                  <p className="font-bold text-zinc-900">
                    {isStableford ? (p.totalStablefordPoints ?? "—") : (p.totalStrokes ?? "—")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">+/-</p>
                  <p className={cn("font-bold",
                    toPar !== undefined && toPar < 0 ? "text-red-600" :
                    toPar !== undefined && toPar > 0 ? "text-blue-600" : "text-zinc-700")}>
                    {formatToPar(toPar)}
                  </p>
                </div>
              </div>
              {showNet && p.totalNetScore !== undefined && (
                <div className="border-t border-zinc-100 pt-2 text-center">
                  <p className="text-xs text-zinc-400">Net Score</p>
                  <p className="font-bold text-zinc-900">{p.totalNetScore}</p>
                </div>
              )}
              {p.scorecardId ? (
                <Button size="sm" variant="outline"
                  className="w-full gap-1.5 border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400"
                  onClick={() => setScoringPlayer({
                    scorecardId: p.scorecardId as Id<"scorecards">,
                    playerId: p.playerId,
                    displayName: p.displayName,
                    bibNumber: p.bibNumber,
                    playingHandicap: p.playingHandicap,
                    holeScores: p.holeScores.map((h) => ({
                      holeNumber: h.holeNumber, strokes: h.strokes,
                      putts: h.putts, penaltyStrokes: h.penaltyStrokes,
                    })),
                  })}>
                  <Pencil className="h-3.5 w-3.5" /> Input Score
                </Button>
              ) : (
                <p className="text-center text-xs text-zinc-400">Belum ada scorecard</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Hole-by-hole grid */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-700">Scorecard Hole-by-Hole</h2>
        {players.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white py-12 text-center">
            <Activity className="h-8 w-8 text-zinc-300 mb-2" />
            <p className="font-medium text-zinc-600">Belum ada skor</p>
            <p className="mt-1 text-sm text-zinc-400">Klik "Input Score" di player card untuk mulai memasukkan skor</p>
          </div>
        ) : (
          <HoleByHoleGrid courseHoles={courseHoles} players={players}
            format={data.format} showNet={showNet && hasHandicap} />
        )}
      </div>

      {/* Score input panel */}
      {scoringPlayer && (
        <ScoreInputPanel
          player={scoringPlayer}
          courseHoles={courseHoles}
          onClose={() => setScoringPlayer(null)}
          onSaved={() => {
            const fresh = data.players.find((p) => p.playerId === scoringPlayer.playerId);
            if (fresh) {
              setScoringPlayer((prev) => prev ? {
                ...prev,
                holeScores: fresh.holeScores.map((h) => ({
                  holeNumber: h.holeNumber, strokes: h.strokes,
                  putts: h.putts, penaltyStrokes: h.penaltyStrokes,
                })),
              } : null);
            }
          }}
        />
      )}
    </div>
  );
}
