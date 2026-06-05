/**
 * TeamMatchPage — Team Match System frontend.
 * Shows team standings, best ball results, and match play head-to-head.
 * Module: Team Match System + Matchplay System
 */

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import {
  ArrowLeft, Users, Trophy, Swords, Radio,
  ChevronDown, ChevronUp
} from "lucide-react";
import { api } from "@/modules/convex/api";
import type { Id } from "@/modules/convex/dataModel";
import { PageSpinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/utils";

// ─── Match Play Head-to-Head Card ─────────────────────────────────────────────

function MatchPlayCard({ matchId }: { matchId: Id<"matches"> }) {
  const data = useQuery(api.subscriptions.matchplay.matchDisplay, { matchId });
  const comparison = useQuery(api.subscriptions.matchplay.matchPlayComparison, { matchId });

  if (data === undefined) return <div className="h-24 animate-pulse rounded-lg bg-zinc-100" />;
  if (!data) return null;

  const { display } = data;
  const isOngoing = data.status === "ongoing";

  return (
    <div className={cn(
      "rounded-xl border p-4 transition-all",
      isOngoing ? "border-green-200 bg-green-50/30" : "border-zinc-200 bg-white"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-zinc-500" />
          <span className="text-sm font-semibold text-zinc-700">
            Round {data.roundNumber}{data.flightName ? ` · ${data.flightName}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data.matchResult && (
            <Badge variant="blue">{data.matchResult}</Badge>
          )}
          {isOngoing && (
            <Badge variant="default" className="gap-1">
              <Radio className="h-3 w-3" />
              Live
            </Badge>
          )}
        </div>
      </div>

      {/* Players */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {/* Player A */}
        <div className="text-left">
          <p className="font-bold text-zinc-900">{display.playerA.displayName}</p>
          <p className={cn(
            "text-2xl font-bold tabular-nums mt-1",
            display.matchStatus === "playerA_won" ? "text-green-700" :
            display.playerA.status === "Leading" ? "text-green-600" :
            display.playerA.status === "Trailing" ? "text-red-600" : "text-zinc-700"
          )}>
            {display.playerA.standing}
          </p>
          <div className="flex gap-2 mt-1 text-xs text-zinc-500">
            <span className="text-green-600 font-medium">{display.playerA.holesWon}W</span>
            <span className="text-zinc-400">{display.playerA.holesHalved}H</span>
            <span className="text-red-500 font-medium">{display.playerA.holesLost}L</span>
          </div>
        </div>

        {/* VS */}
        <div className="text-center">
          <span className="text-xs font-bold text-zinc-400 bg-zinc-100 rounded-full px-2 py-1">VS</span>
          {display.holesRemaining > 0 && (
            <p className="text-xs text-zinc-400 mt-1">{display.holesRemaining} left</p>
          )}
        </div>

        {/* Player B */}
        <div className="text-right">
          <p className="font-bold text-zinc-900">{display.playerB.displayName}</p>
          <p className={cn(
            "text-2xl font-bold tabular-nums mt-1",
            display.matchStatus === "playerB_won" ? "text-green-700" :
            display.playerB.status === "Leading" ? "text-green-600" :
            display.playerB.status === "Trailing" ? "text-red-600" : "text-zinc-700"
          )}>
            {display.playerB.standing}
          </p>
          <div className="flex gap-2 mt-1 text-xs text-zinc-500 justify-end">
            <span className="text-green-600 font-medium">{display.playerB.holesWon}W</span>
            <span className="text-zinc-400">{display.playerB.holesHalved}H</span>
            <span className="text-red-500 font-medium">{display.playerB.holesLost}L</span>
          </div>
        </div>
      </div>

      {/* Nine-hole breakdown */}
      {comparison && comparison.players.length >= 2 && (
        <div className="mt-3 pt-3 border-t border-zinc-200">
          <div className="grid grid-cols-3 gap-2 text-xs text-center">
            <div>
              <p className="text-zinc-500 mb-1">Front 9</p>
              <div className="flex justify-between">
                <span className="font-bold">{comparison.players[0].front9?.strokes ?? "—"}</span>
                <span className="text-zinc-400">vs</span>
                <span className="font-bold">{comparison.players[1].front9?.strokes ?? "—"}</span>
              </div>
            </div>
            <div>
              <p className="text-zinc-500 mb-1">Back 9</p>
              <div className="flex justify-between">
                <span className="font-bold">{comparison.players[0].back9?.strokes ?? "—"}</span>
                <span className="text-zinc-400">vs</span>
                <span className="font-bold">{comparison.players[1].back9?.strokes ?? "—"}</span>
              </div>
            </div>
            <div>
              <p className="text-zinc-500 mb-1">Total</p>
              <div className="flex justify-between">
                <span className="font-bold">{comparison.players[0].total.strokes ?? "—"}</span>
                <span className="text-zinc-400">vs</span>
                <span className="font-bold">{comparison.players[1].total.strokes ?? "—"}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Team Standings ───────────────────────────────────────────────────────────

function TeamStandingsPanel({
  tournamentId,
  roundNumber,
}: {
  tournamentId: Id<"tournaments">;
  roundNumber: number;
}) {
  const data = useQuery(api.subscriptions.matchplay.teamStandings, { tournamentId, roundNumber });

  if (data === undefined) return <div className="h-32 animate-pulse rounded-lg bg-zinc-100" />;
  if (!data.matches.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 py-10 text-center">
        <Users className="mb-2 h-8 w-8 text-zinc-300" />
        <p className="text-sm text-zinc-500">Belum ada data team match</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.matches.map((match) => {
        if (!match) return null;
        const winner = match.winner;
        return (
          <div key={match.matchId} className="rounded-xl border border-zinc-200 bg-white p-4">
            {match.flightName && (
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">{match.flightName}</p>
            )}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              {/* Team A */}
              <div className={cn("rounded-lg p-3", winner === "team1" ? "bg-green-50 border border-green-200" : "bg-zinc-50")}>
                <div className="flex items-center gap-1 mb-1">
                  {winner === "team1" && <Trophy className="h-3.5 w-3.5 text-amber-500" />}
                  <p className="text-xs font-semibold text-zinc-600">Team A</p>
                </div>
                {match.team1.players.map((name, i) => (
                  <p key={i} className="text-sm font-medium text-zinc-900 truncate">{name}</p>
                ))}
                <p className="text-lg font-bold text-zinc-900 mt-1 tabular-nums">
                  {match.team1.holesWon} holes won
                </p>
              </div>

              {/* VS */}
              <div className="text-center">
                <span className="text-xs font-bold text-zinc-400 bg-zinc-100 rounded-full px-2 py-1">VS</span>
                {winner === "tied" && <p className="text-xs text-zinc-400 mt-1">Tied</p>}
              </div>

              {/* Team B */}
              <div className={cn("rounded-lg p-3", winner === "team2" ? "bg-green-50 border border-green-200" : "bg-zinc-50")}>
                <div className="flex items-center gap-1 mb-1 justify-end">
                  {winner === "team2" && <Trophy className="h-3.5 w-3.5 text-amber-500" />}
                  <p className="text-xs font-semibold text-zinc-600">Team B</p>
                </div>
                {match.team2.players.map((name, i) => (
                  <p key={i} className="text-sm font-medium text-zinc-900 truncate text-right">{name}</p>
                ))}
                <p className="text-lg font-bold text-zinc-900 mt-1 tabular-nums text-right">
                  {match.team2.holesWon} holes won
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function TeamMatchPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const id = tournamentId ? (tournamentId as Id<"tournaments">) : undefined;
  const [roundNumber, setRoundNumber] = useState(1);
  const [view, setView] = useState<"matchplay" | "teams">("matchplay");
  const [expandedMatches, setExpandedMatches] = useState(true);

  const tournament = useQuery(api.queries.tournaments.get, id ? { id } : "skip");
  const matches = useQuery(api.queries.tournaments.getMatches, id ? { tournamentId: id } : "skip");

  if (tournament === undefined || matches === undefined) return <PageSpinner />;
  if (!tournament) return <p className="text-zinc-500">Turnamen tidak ditemukan</p>;

  const roundMatches = (matches ?? []).filter((m) => m.roundNumber === roundNumber);
  const isTeamFormat = ["best_ball", "scramble"].includes(tournament.format);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link to={`/tournaments/${tournamentId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900">
                {isTeamFormat ? "Team Match" : "Match Play"}
              </h1>
              <Badge variant="secondary">{tournament.format.replace("_", " ")}</Badge>
            </div>
            <p className="mt-1 text-sm text-zinc-500">{tournament.name}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Round selector */}
          {tournament.totalRounds > 1 && (
            <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
              {Array.from({ length: tournament.totalRounds }, (_, i) => i + 1).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoundNumber(r)}
                  className={cn(
                    "rounded px-3 py-1.5 text-sm font-medium transition-all",
                    roundNumber === r ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
                  )}
                >
                  R{r}
                </button>
              ))}
            </div>
          )}

          {/* View toggle */}
          <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
            <button
              onClick={() => setView("matchplay")}
              className={cn(
                "flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-all",
                view === "matchplay" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <Swords className="h-3.5 w-3.5" />
              Head-to-Head
            </button>
            <button
              onClick={() => setView("teams")}
              className={cn(
                "flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-all",
                view === "teams" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <Users className="h-3.5 w-3.5" />
              Team Standings
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {view === "matchplay" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">{roundMatches.length} matches · Round {roundNumber}</p>
            <button
              onClick={() => setExpandedMatches((v) => !v)}
              className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700"
            >
              {expandedMatches ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {expandedMatches ? "Collapse" : "Expand"}
            </button>
          </div>

          {expandedMatches && (
            roundMatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white py-12 text-center">
                <Swords className="mb-3 h-10 w-10 text-zinc-300" />
                <p className="font-medium text-zinc-600">Belum ada match di ronde ini</p>
                <p className="mt-1 text-sm text-zinc-400">Buat match dari halaman detail turnamen</p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {roundMatches.map((match) => (
                  <MatchPlayCard key={match._id} matchId={match._id as Id<"matches">} />
                ))}
              </div>
            )
          )}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-700" />
              Team Standings · Round {roundNumber}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TeamStandingsPanel tournamentId={id!} roundNumber={roundNumber} />
          </CardContent>
        </Card>
      )}

      {/* Quick link to leaderboard */}
      <div className="flex justify-center">
        <Button asChild variant="outline">
          <Link to={`/tournaments/${tournamentId}/leaderboard`}>
            <Trophy className="h-4 w-4" />
            Lihat Leaderboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
