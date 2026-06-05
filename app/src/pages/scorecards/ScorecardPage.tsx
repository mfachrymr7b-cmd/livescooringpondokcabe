import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Save, Sigma, Trophy } from "lucide-react";
import { api } from "@/modules/convex/api";
import type { Id } from "@/modules/convex/dataModel";
import type {
  GolfCourse,
  GolfHole,
  Player,
  Scorecard,
  ScorecardHole,
  Tournament,
} from "@/modules/convex/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HoleStatusBadge } from "@/components/scoring/HoleStatusBadge";
import { MatchStatusBadge } from "@/components/scoring/MatchStatusBadge";
import { ScoreResultBadge } from "@/components/scoring/ScoreResultBadge";
import {
  classifyGrossToPar,
  computeNetStrokes,
  holeStatusFromSaved,
  scoreResultFromHole,
  type ScoreResult,
} from "@/utils/scoring";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageSpinner } from "@/components/ui/Spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "@/components/ui/Table";

type ScoreDraft = Record<
  number,
  {
    strokes: string;
    putts: string;
    penaltyStrokes: string;
  }
>;

function toScoreDraft(holes: ScorecardHole[]): ScoreDraft {
  return holes.reduce<ScoreDraft>((draft, hole) => {
    draft[hole.holeNumber] = {
      strokes: String(hole.strokes),
      putts: hole.putts != null ? String(hole.putts) : "",
      penaltyStrokes: hole.penaltyStrokes != null ? String(hole.penaltyStrokes) : "",
    };
    return draft;
  }, {});
}

function previewHoleNet(
  strokes: number,
  penaltyStrokes: number | undefined,
  playingHandicap: number | undefined,
  hole: GolfHole
) {
  if (!strokes) return null;
  return computeNetStrokes(strokes, penaltyStrokes, playingHandicap, hole.strokeIndex);
}

function previewScoreResult(
  strokes: number,
  penaltyStrokes: number | undefined,
  par: number
): ScoreResult | null {
  if (!strokes) return null;
  const effective = strokes + (penaltyStrokes ?? 0);
  return classifyGrossToPar(effective - par);
}

function formatMatchplayPoint(points: number | undefined) {
  if (points === undefined) return "—";
  if (points === 1) return "Won";
  if (points === -1) return "Lost";
  return "Halved";
}

function scoreLabel(scoreToPar: number) {
  if (scoreToPar === 0) return "E";
  return scoreToPar > 0 ? `+${scoreToPar}` : String(scoreToPar);
}

export function ScorecardPage() {
  const { scorecardId } = useParams<{ scorecardId: string }>();
  const id = useMemo(
    () => (scorecardId ? (scorecardId as Id<"scorecards">) : undefined),
    [scorecardId]
  );
  const [draft, setDraft] = useState<ScoreDraft>({});
  const [savingHole, setSavingHole] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scorecardArgs = useMemo(() => (id ? { id } : "skip"), [id]);
  const liveScorecardArgs = useMemo(
    () => (id ? { scorecardId: id } : "skip"),
    [id]
  );

  const scorecard = useQuery(api.queries.scorecards.get, scorecardArgs) as Scorecard | null | undefined;
  const liveScorecard = useQuery(api.subscriptions.scorecards.liveHoles, liveScorecardArgs) as
    | {
        totalStrokes?: number;
        totalPutts?: number;
        totalNetScore?: number;
        scoreToPar?: number;
        totalStablefordPoints?: number;
        matchplayStanding?: string;
        playingHandicap?: number;
        holesRecorded: number;
        holes: Array<Omit<ScorecardHole, "_id" | "_creationTime" | "scorecardId" | "holeId">>;
      }
    | null
    | undefined;
  const player = useQuery(
    api.queries.players.get,
    scorecard ? { id: scorecard.playerId as Id<"players"> } : "skip"
  ) as Player | null | undefined;
  const tournament = useQuery(
    api.queries.tournaments.get,
    scorecard ? { id: scorecard.tournamentId as Id<"tournaments"> } : "skip"
  ) as Tournament | null | undefined;
  const course = useQuery(
    api.queries.golf_courses.get,
    tournament ? { id: tournament.courseId as Id<"golf_courses"> } : "skip"
  ) as GolfCourse | null | undefined;
  const courseHolesArgs = useMemo(
    () => (course ? { courseId: course._id as Id<"golf_courses"> } : "skip"),
    [course]
  );
  const courseHoles = useQuery(
    api.queries.golf_courses.getHoles,
    courseHolesArgs
  ) as GolfHole[] | undefined;
  const savedHoles = useQuery(
    api.queries.scorecards.getHoleScores,
    id ? { scorecardId: id } : "skip"
  ) as ScorecardHole[] | undefined;
  const match = useQuery(
    api.queries.matches.get,
    scorecard?.matchId ? { id: scorecard.matchId as Id<"matches"> } : "skip"
  ) as { status: string } | null | undefined;
  const recordHoleScore = useMutation(api.mutations.scorecards.recordHoleScore);

  const sortedHoles = useMemo(
    () => [...(courseHoles ?? [])].sort((a, b) => a.holeNumber - b.holeNumber),
    [courseHoles]
  );
  const savedByHole = useMemo(() => {
    return new Map((savedHoles ?? []).map((hole) => [hole.holeNumber, hole]));
  }, [savedHoles]);
  const savedDraft = useMemo(() => toScoreDraft(savedHoles ?? []), [savedHoles]);
  const courseHolesLoading = course !== null && courseHoles === undefined;

  const summary = useMemo(() => {
    let totalStrokes = 0;
    let totalNet = 0;
    let totalPutts = 0;
    let totalPar = 0;
    let holesRecorded = 0;

    for (const hole of sortedHoles) {
      const value = draft[hole.holeNumber] ?? savedDraft[hole.holeNumber];
      const strokes = Number(value?.strokes);
      if (!Number.isFinite(strokes) || strokes <= 0) continue;
      const putts = Number(value?.putts);
      const penalty = Number(value?.penaltyStrokes);

      holesRecorded += 1;
      totalStrokes += strokes + (Number.isFinite(penalty) && penalty > 0 ? penalty : 0);
      totalNet += computeNetStrokes(
        strokes,
        Number.isFinite(penalty) && penalty >= 0 ? penalty : undefined,
        scorecard?.playingHandicap,
        hole.strokeIndex
      );
      totalPutts += Number.isFinite(putts) && putts > 0 ? putts : 0;
      totalPar += hole.par;
    }

    return {
      holesRecorded,
      totalStrokes,
      totalNet,
      totalPutts,
      scoreToPar: totalPar > 0 ? totalStrokes - totalPar : 0,
    };
  }, [draft, savedDraft, scorecard?.playingHandicap, sortedHoles]);

  function updateDraft(holeNumber: number, key: keyof ScoreDraft[number], value: string) {
    setDraft((prev) => ({
      ...prev,
      [holeNumber]: {
        strokes: prev[holeNumber]?.strokes ?? savedDraft[holeNumber]?.strokes ?? "",
        putts: prev[holeNumber]?.putts ?? savedDraft[holeNumber]?.putts ?? "",
        penaltyStrokes:
          prev[holeNumber]?.penaltyStrokes ?? savedDraft[holeNumber]?.penaltyStrokes ?? "",
        [key]: value,
      },
    }));
  }

  async function saveHole(hole: GolfHole) {
    const value = draft[hole.holeNumber] ?? savedDraft[hole.holeNumber];
    const strokes = Number(value?.strokes);
    if (!Number.isFinite(strokes) || strokes <= 0) {
      setError("Strokes wajib diisi dengan angka lebih dari 0.");
      return;
    }

    const putts = Number(value?.putts);
    const penaltyStrokes = Number(value?.penaltyStrokes);

    setSavingHole(hole.holeNumber);
    setError(null);
    try {
      await recordHoleScore({
        scorecardId: id!,
        holeId: hole._id as Id<"golf_holes">,
        holeNumber: hole.holeNumber,
        strokes,
        putts: Number.isFinite(putts) && putts >= 0 ? putts : undefined,
        penaltyStrokes:
          Number.isFinite(penaltyStrokes) && penaltyStrokes >= 0 ? penaltyStrokes : undefined,
      });
      setDraft((prev) => {
        const next = { ...prev };
        delete next[hole.holeNumber];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan skor hole.");
    } finally {
      setSavingHole(null);
    }
  }

  if (!id) {
    return <p className="text-emerald-300">Scorecard tidak ditemukan</p>;
  }

  if (
    scorecard === undefined ||
    player === undefined ||
    tournament === undefined
  ) {
    return <PageSpinner />;
  }

  if (!scorecard || !tournament || !player) {
    return <p className="text-emerald-300">Scorecard tidak ditemukan</p>;
  }

  const displayedTotal = liveScorecard?.totalStrokes ?? scorecard.totalStrokes ?? summary.totalStrokes;
  const displayedNet = liveScorecard?.totalNetScore ?? scorecard.totalNetScore ?? summary.totalNet;
  const displayedToPar = liveScorecard?.scoreToPar ?? scorecard.scoreToPar ?? summary.scoreToPar;
  const displayedPutts = liveScorecard?.totalPutts ?? scorecard.totalPutts ?? summary.totalPutts;
  const holesRecorded = liveScorecard?.holesRecorded ?? summary.holesRecorded;
  const isStableford = tournament.format === "stableford";
  const isMatchPlay = tournament.format === "match_play";
  const displayedStableford =
    liveScorecard?.totalStablefordPoints ??
    scorecard.totalStablefordPoints ??
    undefined;
  const matchplayStanding =
    liveScorecard?.matchplayStanding ?? scorecard.matchplayStanding;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link to={`/tournaments/${scorecard.tournamentId}/scorecards`} aria-label="Kembali ke daftar scorecard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-white">Scorecard</h1>
              <Badge variant={scorecard.status === "verified" ? "default" : "secondary"}>
                {scorecard.status}
              </Badge>
              {match && <MatchStatusBadge status={match.status} />}
            </div>
            <p className="mt-1 text-sm text-emerald-300">
              {player.displayName} · {tournament.name} · Round {scorecard.roundNumber}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
          <ScoreMetric label="Total" value={displayedTotal || 0} />
          <ScoreMetric label="Net" value={displayedNet || 0} />
          <ScoreMetric label="To Par" value={scoreLabel(displayedToPar || 0)} />
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-900/30 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Score Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`grid gap-3 ${isStableford || isMatchPlay ? "sm:grid-cols-3 lg:grid-cols-6" : "sm:grid-cols-5"}`}
          >
            <SummaryTile label="Holes" value={`${holesRecorded}/${sortedHoles.length || 18}`} />
            <SummaryTile label="Gross Score" value={displayedTotal || 0} />
            <SummaryTile label="Net Score" value={displayedNet || 0} />
            <SummaryTile label="Putts" value={displayedPutts || 0} />
            <SummaryTile label="Handicap" value={scorecard.playingHandicap ?? "-"} />
            {isStableford && (
              <SummaryTile label="Stableford" value={displayedStableford ?? 0} />
            )}
            {isMatchPlay && (
              <SummaryTile label="Match" value={matchplayStanding ?? "—"} />
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3 md:hidden">
        {courseHolesLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          </div>
        ) : sortedHoles.length === 0 ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-900/20 px-4 py-5 text-center">
            <p className="font-semibold text-amber-300">Hole data belum tersedia</p>
            <p className="mt-1 text-sm text-amber-400">Pastikan data hole lapangan sudah diisi di menu Lapangan.</p>
          </div>
        ) : (
          sortedHoles.map((hole) => (
            <MobileHoleCard
              key={hole._id}
              hole={hole}
              saved={savedByHole.get(hole.holeNumber)}
              value={draft[hole.holeNumber] ?? savedDraft[hole.holeNumber]}
              net={previewHoleNet(
                Number((draft[hole.holeNumber] ?? savedDraft[hole.holeNumber])?.strokes) || 0,
                Number((draft[hole.holeNumber] ?? savedDraft[hole.holeNumber])?.penaltyStrokes) || undefined,
                scorecard.playingHandicap,
                hole
              )}
              isMatchPlay={isMatchPlay}
              isStableford={isStableford}
              isSaving={savingHole === hole.holeNumber}
              onChange={updateDraft}
              onSave={() => void saveHole(hole)}
            />
          ))
        )}
      </div>

      <div className="hidden md:block">
        {courseHolesLoading ? (
          <div className="flex items-center justify-center rounded-xl border border-emerald-700/50 py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          </div>
        ) : sortedHoles.length === 0 ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-900/20 px-4 py-5 text-center">
            <p className="font-semibold text-amber-300">Hole data belum tersedia</p>
            <p className="mt-1 text-sm text-amber-400">Pastikan data hole lapangan sudah diisi di menu Lapangan.</p>
          </div>
        ) : (
          <TableWrapper>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hole</TableHead>
                <TableHead>Par</TableHead>
                <TableHead>HCP</TableHead>
                <TableHead className="w-28">Strokes</TableHead>
                <TableHead className="w-28">Putts</TableHead>
                <TableHead className="w-28">Penalty</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Result</TableHead>
                {isStableford && <TableHead>SF</TableHead>}
                {isMatchPlay && <TableHead>Match</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedHoles.map((hole) => {
                const value = draft[hole.holeNumber] ?? savedDraft[hole.holeNumber];
                const strokes = Number(value?.strokes) || 0;
                const penalty = Number(value?.penaltyStrokes);
                const saved = savedByHole.get(hole.holeNumber);
                const previewResult =
                  saved && scoreResultFromHole(saved)
                    ? scoreResultFromHole(saved)
                    : previewScoreResult(
                        strokes,
                        Number.isFinite(penalty) ? penalty : undefined,
                        hole.par
                      );
                const net =
                  saved?.netStrokes ??
                  previewHoleNet(
                    strokes,
                    Number.isFinite(penalty) ? penalty : undefined,
                    scorecard.playingHandicap,
                    hole
                  );
                return (
                  <TableRow key={hole._id}>
                    <TableCell className="font-semibold">{hole.holeNumber}</TableCell>
                    <TableCell>{hole.par}</TableCell>
                    <TableCell>{hole.strokeIndex}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        value={value?.strokes ?? ""}
                        onChange={(event) => updateDraft(hole.holeNumber, "strokes", event.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={value?.putts ?? ""}
                        onChange={(event) => updateDraft(hole.holeNumber, "putts", event.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={value?.penaltyStrokes ?? ""}
                        onChange={(event) =>
                          updateDraft(hole.holeNumber, "penaltyStrokes", event.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell className="font-semibold text-white">{net ?? "-"}</TableCell>
                    <TableCell>
                      {previewResult ? (
                        <ScoreResultBadge result={previewResult} />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    {isStableford && (
                      <TableCell className="tabular-nums font-medium">
                        {saved?.stablefordPoints ?? "—"}
                      </TableCell>
                    )}
                    {isMatchPlay && (
                      <TableCell className="text-sm font-medium">
                        {formatMatchplayPoint(saved?.matchplayPoints)}
                      </TableCell>
                    )}
                    <TableCell>
                      <HoleStatusBadge status={holeStatusFromSaved(Boolean(saved))} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        loading={savingHole === hole.holeNumber}
                        onClick={() => void saveHole(hole)}
                      >
                        <Save className="h-4 w-4" />
                        Simpan
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </TableWrapper>
        )}
      </div>
    </div>
  );
}

function ScoreMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-emerald-600/40 bg-emerald-800/40 p-3 text-center shadow-sm">
      <p className="text-xs font-medium uppercase text-emerald-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-emerald-900/40 p-3 border border-emerald-700/40">
      <div className="flex items-center gap-2 text-xs font-medium uppercase text-emerald-400">
        {label === "Gross Score" ? <Trophy className="h-3.5 w-3.5" /> : <Sigma className="h-3.5 w-3.5" />}
        {label}
      </div>
      <p className="mt-2 text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function MobileHoleCard({
  hole,
  saved,
  value,
  net,
  isMatchPlay,
  isStableford,
  isSaving,
  onChange,
  onSave,
}: {
  hole: GolfHole;
  saved?: ScorecardHole;
  value?: ScoreDraft[number];
  net: number | null;
  isMatchPlay: boolean;
  isStableford: boolean;
  isSaving: boolean;
  onChange: (holeNumber: number, key: keyof ScoreDraft[number], value: string) => void;
  onSave: () => void;
}) {
  const strokes = Number(value?.strokes) || 0;
  const penalty = Number(value?.penaltyStrokes);
  const result =
    saved && scoreResultFromHole(saved)
      ? scoreResultFromHole(saved)
      : previewScoreResult(strokes, Number.isFinite(penalty) ? penalty : undefined, hole.par);
  return (
    <Card className="rounded-lg">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-white">Hole {hole.holeNumber}</p>
            <p className="text-sm text-emerald-300">
              Par {hole.par} · SI {hole.strokeIndex}
              {saved?.handicapStrokes ? ` · -${saved.handicapStrokes} HCP` : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <HoleStatusBadge status={holeStatusFromSaved(Boolean(saved))} />
            {result && <ScoreResultBadge result={result} />}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label htmlFor={`strokes-${hole.holeNumber}`} className="text-xs font-medium text-emerald-300">Strokes</label>
            <Input
              id={`strokes-${hole.holeNumber}`}
              type="number"
              min={1}
              value={value?.strokes ?? ""}
              onChange={(event) => onChange(hole.holeNumber, "strokes", event.target.value)}
              className="h-11 text-base"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor={`putts-${hole.holeNumber}`} className="text-xs font-medium text-emerald-300">Putts</label>
            <Input
              id={`putts-${hole.holeNumber}`}
              type="number"
              min={0}
              value={value?.putts ?? ""}
              onChange={(event) => onChange(hole.holeNumber, "putts", event.target.value)}
              className="h-11 text-base"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor={`penalty-${hole.holeNumber}`} className="text-xs font-medium text-emerald-300">Penalty</label>
            <Input
              id={`penalty-${hole.holeNumber}`}
              type="number"
              min={0}
              value={value?.penaltyStrokes ?? ""}
              onChange={(event) => onChange(hole.holeNumber, "penaltyStrokes", event.target.value)}
              className="h-11 text-base"
            />
          </div>
        </div>

        <div className="space-y-2 rounded-md bg-emerald-900/40 border border-emerald-700/40 px-3 py-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium text-emerald-400">Net score</span>
            <span className="text-lg font-bold text-white">{net ?? "—"}</span>
          </div>
          {isStableford && saved?.stablefordPoints !== undefined && (
            <div className="flex items-center justify-between">
              <span className="font-medium text-emerald-400">Stableford</span>
              <span className="font-bold text-white">{saved.stablefordPoints}</span>
            </div>
          )}
          {isMatchPlay && (
            <div className="flex items-center justify-between">
              <span className="font-medium text-emerald-400">Match hole</span>
              <span className="font-bold text-white">
                {formatMatchplayPoint(saved?.matchplayPoints)}
              </span>
            </div>
          )}
        </div>

        <Button className="w-full" loading={isSaving} onClick={onSave}>
          <Save className="h-4 w-4" />
          Simpan Hole
        </Button>
      </CardContent>
    </Card>
  );
}
