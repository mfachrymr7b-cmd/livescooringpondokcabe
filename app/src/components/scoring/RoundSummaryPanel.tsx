import { useQuery } from "convex/react";
import { Trophy } from "lucide-react";
import { api } from "@/modules/convex/api";
import type { Id } from "@/modules/convex/dataModel";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { MatchStatusBadge } from "./MatchStatusBadge";

type MatchSummary = {
  matchId: string;
  roundNumber: number;
  flightName?: string;
  status: string;
  matchResult?: string;
  winnerName?: string;
  players: Array<{
    playerId: string;
    displayName: string;
    totalStrokes?: number;
    matchplayStanding?: string;
    isMatchWinner?: boolean;
  }>;
};

export function RoundSummaryPanel({
  tournamentId,
  roundNumber,
}: {
  tournamentId: Id<"tournaments">;
  roundNumber: number;
}) {
  const summary = useQuery(api.subscriptions.rounds.roundSummary, {
    tournamentId,
    roundNumber,
  });

  if (summary === undefined) {
    return <LoadingSkeleton />;
  }
  if (!summary) return null;

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-green-700" />
          Round {summary.roundNumber} Summary
        </CardTitle>
        <p className="text-sm text-emerald-300">
          {summary.submittedCount} submitted · {summary.inProgressCount} in progress · avg{" "}
          {summary.averageStrokes || "—"}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary.leader && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-800/50 px-3 py-2 text-sm">
            <span className="font-medium text-emerald-200">Leader: </span>
            <span className="text-white font-black">
              #{summary.leader.rankDisplay} · {summary.leader.totalStrokes} strokes (
              {summary.leader.scoreToPar > 0
                ? `+${summary.leader.scoreToPar}`
                : summary.leader.scoreToPar}
              )
            </span>
          </div>
        )}

        <div className="space-y-2">
          {summary.matches.length === 0 ? (
            <p className="text-sm text-emerald-300">Belum ada match di ronde ini.</p>
          ) : (
            summary.matches.map((match: MatchSummary) => (
              <MatchSummaryCard key={match.matchId} match={match} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MatchSummaryCard({ match }: { match: MatchSummary }) {
  return (
    <div className="rounded-lg border border-emerald-600/40 bg-emerald-800/30 px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white">
          {match.flightName ? `${match.flightName} · ` : ""}Round {match.roundNumber}
        </p>
        <div className="flex items-center gap-2">
          {match.matchResult && <Badge variant="blue">{match.matchResult}</Badge>}
          {match.winnerName && <Badge variant="default">{match.winnerName}</Badge>}
          <MatchStatusBadge status={match.status} />
        </div>
      </div>
      <div className="mt-2 space-y-1">
        {match.players.map((player) => (
          <div key={player.playerId} className="flex items-center justify-between text-sm">
            <span
              className={
                player.isMatchWinner ? "font-black text-emerald-900" : "text-slate-900 font-black"
              }
            >
              {player.displayName}
              {player.isMatchWinner && (
                <Badge variant="default" className="ml-2">
                  Winner
                </Badge>
              )}
            </span>
            <span className="text-emerald-300">
              {player.matchplayStanding ?? player.totalStrokes ?? "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return <div className="h-32 animate-pulse rounded-lg bg-emerald-700/30" />;
}
