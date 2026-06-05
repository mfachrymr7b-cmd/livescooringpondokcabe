import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { Radio, Trophy } from "lucide-react";
import { api } from "@/modules/convex/api";
import type { Id } from "@/modules/convex/dataModel";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/shared/EmptyState";
import { LeaderboardTable, type LiveLeaderboardRow } from "./LeaderboardTable";

export function LiveLeaderboardPreview({
  tournamentId,
  useHandicap,
  holesPerRound = 18,
  limit = 5,
}: {
  tournamentId: Id<"tournaments">;
  useHandicap: boolean;
  holesPerRound?: number;
  limit?: number;
}) {
  const grossRows = useQuery(api.subscriptions.leaderboard.top, {
    tournamentId,
    limit,
  });
  const netRows = useQuery(
    api.subscriptions.leaderboard.liveNet,
    useHandicap ? { tournamentId } : "skip"
  );

  const rows: LiveLeaderboardRow[] | undefined = useHandicap
    ? netRows?.slice(0, limit).map((entry) => ({
        rank: entry.rank,
        rankDisplay: entry.rankDisplay,
        rankNet: entry.rank,
        rankNetDisplay: entry.rankDisplay,
        rankGross: entry.rankGross,
        isTied: entry.isTied,
        playerId: entry.playerId,
        displayName: entry.displayName,
        avatarUrl: entry.avatarUrl,
        bibNumber: entry.bibNumber,
        totalStrokes: entry.totalStrokes,
        totalNetScore: entry.totalNetScore,
        scoreToPar: entry.scoreToPar,
        holesCompleted: entry.holesCompleted,
        isWithdrawn: entry.isWithdrawn,
        isDisqualified: entry.isDisqualified,
      }))
    : grossRows?.map((entry) => ({
        rank: entry.rank,
        rankDisplay: entry.rankDisplay,
        isTied: entry.isTied,
        playerId: entry.playerId,
        displayName: entry.displayName,
        avatarUrl: entry.avatarUrl,
        totalStrokes: entry.totalStrokes,
        scoreToPar: entry.scoreToPar,
        holesCompleted: entry.holesCompleted,
        isWithdrawn: entry.isWithdrawn,
        isDisqualified: entry.isDisqualified,
      }));

  const view = useHandicap ? "net" : "gross";

  return (
    <Card className="rounded-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-green-600" />
            Live Leaderboard
          </CardTitle>
          <p className="mt-1 text-sm text-emerald-300">
            Pembaruan otomatis saat skor hole disimpan
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to={`/tournaments/${tournamentId}/leaderboard`}>Lihat semua</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {rows === undefined ? (
          <div className="h-24 animate-pulse rounded-lg bg-emerald-700/30" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Trophy className="h-8 w-8" />}
            title="Belum ada skor"
            description="Leaderboard akan muncul setelah skor dimasukkan"
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-emerald-600/40">
            <LeaderboardTable
              rows={rows}
              view={view}
              holesPerRound={holesPerRound}
              showNetColumn={useHandicap}
              compact
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
