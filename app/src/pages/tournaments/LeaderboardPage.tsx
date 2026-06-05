import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { ArrowLeft, Medal, Radio } from "lucide-react";
import { api } from "@/modules/convex/api";
import type { Id } from "@/modules/convex/dataModel";
import type { Tournament } from "@/modules/convex/types";
import { PageSpinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  LeaderboardTable,
  type LeaderboardView,
  type LiveLeaderboardRow,
} from "@/components/scoring/LeaderboardTable";

export function LeaderboardPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const id = tournamentId ? (tournamentId as Id<"tournaments">) : undefined;
  const [view, setView] = useState<LeaderboardView>("gross");

  const tournament = useQuery(api.queries.tournaments.get, id ? { id } : "skip") as
    | Tournament
    | null
    | undefined;
  const isStableford = tournament?.format === "stableford";

  const grossLeaderboard = useQuery(api.subscriptions.leaderboard.live, id ? {
    tournamentId: id,
  } : "skip");
  const netLeaderboard = useQuery(
    api.subscriptions.leaderboard.liveNet,
    tournament?.useHandicap && !isStableford && id ? { tournamentId: id } : "skip"
  );

  const activeData =
    isStableford || view === "net" ? netLeaderboard ?? grossLeaderboard : grossLeaderboard;

  if (tournament === undefined || activeData === undefined) return <PageSpinner />;

  const rows: LiveLeaderboardRow[] = (activeData ?? []).map((entry) => ({
    rank: isStableford && "rankStableford" in entry && entry.rankStableford
      ? entry.rankStableford
      : entry.rank,
    rankDisplay:
      isStableford && "rankStablefordDisplay" in entry && entry.rankStablefordDisplay
        ? entry.rankStablefordDisplay
        : "rankDisplay" in entry
          ? entry.rankDisplay
          : undefined,
    rankNet: "rankNet" in entry ? entry.rankNet : undefined,
    rankNetDisplay: "rankNetDisplay" in entry ? entry.rankNetDisplay : undefined,
    rankGross: "rankGross" in entry ? entry.rankGross : entry.rank,
    isTied: "isTied" in entry ? entry.isTied : undefined,
    playerId: entry.playerId,
    displayName: entry.displayName,
    avatarUrl: entry.avatarUrl,
    bibNumber: "bibNumber" in entry ? entry.bibNumber : undefined,
    totalStrokes: entry.totalStrokes,
    totalNetScore: entry.totalNetScore,
    scoreToPar: entry.scoreToPar,
    holesCompleted: entry.holesCompleted,
    currentRound: entry.currentRound,
    isWithdrawn: entry.isWithdrawn,
    isDisqualified: entry.isDisqualified,
  }));

  const showNetToggle = (tournament?.useHandicap ?? false) && !isStableford;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link to={`/tournaments/${tournamentId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <TitleBlock tournament={tournament} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="blue" className="gap-1">
            <Radio className="h-3 w-3" />
            Live
          </Badge>
          {showNetToggle && (
            <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
              <Button
                type="button"
                size="sm"
                variant={view === "gross" ? "default" : "ghost"}
                onClick={() => setView("gross")}
              >
                Gross
              </Button>
              <Button
                type="button"
                size="sm"
                variant={view === "net" ? "default" : "ghost"}
                onClick={() => setView("net")}
              >
                Net
              </Button>
            </div>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Medal className="h-8 w-8" />}
          title="Belum ada data"
          description="Leaderboard akan muncul setelah skor dimasukkan"
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-emerald-700/50">
          <LeaderboardTable
            rows={rows}
            view={view}
            holesPerRound={tournament?.holesPerRound ?? 18}
            showNetColumn={showNetToggle}
          />
        </div>
      )}
    </div>
  );
}

function TitleBlock({ tournament }: { tournament: Tournament | null }) {
  return (
    <div>
      <h1 className="text-xl font-bold text-zinc-900">Live Leaderboard</h1>
      {tournament && <p className="text-sm text-zinc-500">{tournament.name}</p>}
    </div>
  );
}
