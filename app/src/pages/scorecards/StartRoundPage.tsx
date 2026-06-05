/**
 * StartRoundPage — Scorecard creation flow.
 * Player selects their match/round, then a scorecard is created.
 * Module: Mobile Scoring + Scoring System
 *
 * Route: /tournaments/:tournamentId/start-round
 */

import { useState, FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { ArrowLeft, Play, Calculator, Info } from "lucide-react";
import { api } from "@/modules/convex/api";
import type { Id } from "@/modules/convex/dataModel";
import { PageSpinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/utils";
import { calcTournamentHandicap } from "@/utils/handicap";

function formatDate(ts: number) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(ts));
}

export function StartRoundPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const id = tournamentId ? (tournamentId as Id<"tournaments">) : undefined;
  const navigate = useNavigate();

  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [handicapOverride, setHandicapOverride] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tournament = useQuery(api.queries.tournaments.get, id ? { id } : "skip");
  const matches = useQuery(api.queries.tournaments.getMatches, id ? { tournamentId: id } : "skip");
  const playersResult = useQuery(api.queries.players.listByTournament, id ? {
    tournamentId: id,
    paginationOpts: { numItems: 200, cursor: null },
  } : "skip");
  const course = useQuery(
    api.queries.golf_courses.get,
    tournament ? { id: tournament.courseId as Id<"golf_courses"> } : "skip"
  );

  const createScorecard = useMutation(api.mutations.scorecards.create);

  const players = playersResult?.page ?? [];
  const scheduledMatches = (matches ?? []).filter((m) => m.status === "scheduled" || m.status === "ongoing");

  // Calculate playing handicap preview
  const selectedPlayer = players.find((p) => p._id === selectedPlayerId);
  const handicapPreview = (() => {
    if (!selectedPlayer || !tournament || !course) return null;
    const hcpIndex = handicapOverride ? Number(handicapOverride) : (selectedPlayer.handicapIndex ?? 0);
    if (!Number.isFinite(hcpIndex)) return null;
    return calcTournamentHandicap({
      handicapIndex: hcpIndex,
      slopeRating: course.slopeRating ?? 113,
      courseRating: course.courseRating ?? course.par,
      par: course.par,
      format: tournament.format,
    });
  })();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedMatchId) { setError("Pilih match/round terlebih dahulu"); return; }
    if (!selectedPlayerId) { setError("Pilih player terlebih dahulu"); return; }

    const match = matches?.find((m) => m._id === selectedMatchId);
    if (!match) { setError("Match tidak ditemukan"); return; }

    setIsSubmitting(true);
    try {
      const scorecardId = await createScorecard({
        playerId: selectedPlayerId as Id<"players">,
        tournamentId: id as Id<"tournaments">,
        matchId: selectedMatchId as Id<"matches">,
        roundNumber: match.roundNumber,
        playingHandicap: handicapPreview?.playingHandicap,
      });
      navigate(`/scorecards/${scorecardId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat scorecard");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (tournament === undefined || matches === undefined || playersResult === undefined) {
    return <PageSpinner />;
  }

  if (!tournament) {
    return <p className="text-emerald-300">Turnamen tidak ditemukan</p>;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link to={`/tournaments/${tournamentId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-white">Mulai Ronde</h1>
          <p className="mt-1 text-sm text-emerald-300">{tournament.name}</p>
        </div>
      </div>

      {/* Tournament info */}
      <div className="rounded-lg border border-emerald-600/40 bg-emerald-800/30 px-4 py-3">
        <div className="flex flex-wrap gap-3 text-sm text-emerald-200">
          <span className="flex items-center gap-1">
            <Info className="h-3.5 w-3.5 text-emerald-400" />
            Format: <strong>{tournament.format.replace("_", " ")}</strong>
          </span>
          <span>{tournament.holesPerRound} holes</span>
          {tournament.useHandicap && <Badge variant="secondary">Handicap aktif</Badge>}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-md border border-red-500/40 bg-red-900/30 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Step 1: Select Match */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Pilih Match / Round</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {scheduledMatches.length === 0 ? (
              <div className="rounded-lg border border-amber-500/40 bg-amber-900/20 px-4 py-4 text-sm">
                <p className="font-semibold text-amber-300 mb-1">Belum ada round/match tersedia</p>
                <p className="text-amber-200/80 text-xs mb-3">
                  Round harus dibuat terlebih dahulu sebelum bisa mulai scoring.
                </p>
                <Link
                  to={`/tournaments/${tournamentId}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors"
                >
                  <Play className="h-3.5 w-3.5" />
                  Buat Round di Halaman Turnamen
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {scheduledMatches.map((match) => (
                  <label
                    key={match._id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all",
                      selectedMatchId === match._id
                        ? "border-emerald-400 bg-emerald-700/40"
                        : "border-emerald-600/40 bg-emerald-800/20 hover:border-emerald-500 hover:bg-emerald-700/30"
                    )}
                  >
                    <input
                      type="radio"
                      name="matchId"
                      value={match._id}
                      checked={selectedMatchId === match._id}
                      onChange={(e) => setSelectedMatchId(e.target.value)}
                      className="accent-green-400"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm">
                        Round {match.roundNumber}
                        {match.flightName ? ` · ${match.flightName}` : ""}
                      </p>
                      <p className="text-xs text-emerald-300">
                        {formatDate(match.scheduledDate)} · Hole {match.startingHole} · {match.holesPlayed} holes
                      </p>
                    </div>
                    <Badge variant={match.status === "ongoing" ? "default" : "secondary"}>
                      {match.status}
                    </Badge>
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Select Player */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Pilih Player</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {players.length === 0 ? (
              <p className="text-sm text-emerald-400">Belum ada player terdaftar</p>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="playerSelect">Player</Label>
                <select
                  id="playerSelect"
                  value={selectedPlayerId}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                  className="h-9 w-full appearance-none rounded-md border border-emerald-600/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  style={{ backgroundColor: "#065F46", color: "#ECFDF5" }}
                >
                  <option value="" style={{ backgroundColor: "#064e3b" }}>-- Pilih player --</option>
                  {players
                    .filter((p) => p.status === "confirmed" || p.status === "registered")
                    .map((p) => (
                      <option key={p._id} value={p._id} style={{ backgroundColor: "#064e3b" }}>
                        {p.displayName}
                        {p.bibNumber ? ` (#${p.bibNumber})` : ""}
                        {p.handicapIndex !== undefined ? ` · HCP ${p.handicapIndex}` : ""}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Selected player info */}
            {selectedPlayer && (
              <div className="rounded-lg border border-emerald-600/40 bg-emerald-800/30 px-3 py-2.5 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-emerald-400">Handicap Index</p>
                    <p className="font-semibold text-white">{selectedPlayer.handicapIndex ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-emerald-400">Status</p>
                    <p className="font-semibold text-white capitalize">{selectedPlayer.status}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Handicap (if applicable) */}
        {tournament.useHandicap && selectedPlayer && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-4 w-4 text-green-700" />
                3. Handicap
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="handicapOverride">
                  Override Handicap Index
                  <span className="ml-1 text-xs font-normal text-white">(opsional)</span>
                </Label>
                <Input
                  id="handicapOverride"
                  type="number"
                  step="0.1"
                  min="0"
                  max="54"
                  value={handicapOverride}
                  onChange={(e) => setHandicapOverride(e.target.value)}
                  placeholder={String(selectedPlayer.handicapIndex ?? 0)}
                />
              </div>

              {handicapPreview && (
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-800/50 px-3 py-2.5">
                  <p className="text-xs font-semibold text-emerald-300 mb-2 uppercase tracking-wide">
                    Kalkulasi WHS
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-emerald-400">Course HCP</p>
                      <p className="font-bold text-white">{handicapPreview.courseHandicap}</p>
                    </div>
                    <div>
                      <p className="text-xs text-emerald-400">Playing HCP</p>
                      <p className="font-bold text-white text-lg">{handicapPreview.playingHandicap}</p>
                    </div>
                    <div>
                      <p className="text-xs text-emerald-400">Allowance</p>
                      <p className="font-bold text-white">{Math.round(handicapPreview.allowance * 100)}%</p>
                    </div>
                  </div>
                  {course && (
                    <p className="text-xs text-emerald-400 mt-2">
                      Course Rating: {course.courseRating ?? course.par} · Slope: {course.slopeRating ?? 113}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          loading={isSubmitting}
          disabled={!selectedMatchId || !selectedPlayerId || scheduledMatches.length === 0}
        >
          <Play className="h-5 w-5" />
          Mulai Scoring
        </Button>
      </form>
    </div>
  );
}
