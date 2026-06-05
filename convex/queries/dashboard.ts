/**
 * ─── Dashboard Queries ────────────────────────────────────────────────────────
 * Aggregated stats for the admin dashboard.
 * All queries are reactive — Convex will push updates automatically.
 */

import { query } from "../_generated/server";
import { v } from "convex/values";

/** Global stats: courses, active tournaments, total players, completed matches */
export const globalStats = query({
  args: {},
  handler: async (ctx) => {
    const [activeCourses, ongoingTournaments, completedMatches] = await Promise.all([
      ctx.db.query("golf_courses").withIndex("by_isActive", (q) => q.eq("isActive", true)).take(500),
      ctx.db.query("tournaments").withIndex("by_status", (q) => q.eq("status", "ongoing")).take(100),
      ctx.db.query("matches").withIndex("by_status", (q) => q.eq("status", "completed")).take(500),
    ]);

    // Count total active players (confirmed + registered across all ongoing tournaments)
    const allPlayers = await ctx.db.query("players").take(2000);
    const activePlayers = allPlayers.filter(
      (p) => p.status === "confirmed" || p.status === "registered"
    );

    return {
      totalCourses: activeCourses.length,
      activeTournaments: ongoingTournaments.length,
      totalPlayers: activePlayers.length,
      completedMatches: completedMatches.length,
    };
  },
});

/** Recent activity: last 20 scorecard submissions */
export const recentActivity = query({
  args: {},
  handler: async (ctx) => {
    const scorecards = await ctx.db
      .query("scorecards")
      .withIndex("by_status", (q) => q.eq("status", "submitted"))
      .order("desc")
      .take(10);

    const enriched = await Promise.all(
      scorecards.map(async (sc) => {
        const player = await ctx.db.get(sc.playerId);
        const tournament = await ctx.db.get(sc.tournamentId);
        return {
          scorecardId: sc._id,
          playerName: player?.displayName ?? "Unknown",
          tournamentName: tournament?.name ?? "Unknown",
          roundNumber: sc.roundNumber,
          totalStrokes: sc.totalStrokes,
          status: sc.status,
          submittedAt: sc.submittedAt ?? sc._creationTime,
        };
      })
    );

    return enriched;
  },
});

/** Tournament stats: breakdown by status */
export const tournamentStats = query({
  args: {},
  handler: async (ctx) => {
    const [draft, open, closed, ongoing, completed, cancelled] = await Promise.all([
      ctx.db.query("tournaments").withIndex("by_status", (q) => q.eq("status", "draft")).take(200),
      ctx.db.query("tournaments").withIndex("by_status", (q) => q.eq("status", "registration_open")).take(200),
      ctx.db.query("tournaments").withIndex("by_status", (q) => q.eq("status", "registration_closed")).take(200),
      ctx.db.query("tournaments").withIndex("by_status", (q) => q.eq("status", "ongoing")).take(200),
      ctx.db.query("tournaments").withIndex("by_status", (q) => q.eq("status", "completed")).take(200),
      ctx.db.query("tournaments").withIndex("by_status", (q) => q.eq("status", "cancelled")).take(200),
    ]);

    return {
      draft: draft.length,
      registration_open: open.length,
      registration_closed: closed.length,
      ongoing: ongoing.length,
      completed: completed.length,
      cancelled: cancelled.length,
      total: draft.length + open.length + closed.length + ongoing.length + completed.length + cancelled.length,
    };
  },
});

/** Leaderboard summary for ongoing tournaments */
export const ongoingTournamentsSummary = query({
  args: {},
  handler: async (ctx) => {
    const ongoing = await ctx.db
      .query("tournaments")
      .withIndex("by_status", (q) => q.eq("status", "ongoing"))
      .take(10);

    const enriched = await Promise.all(
      ongoing.map(async (t) => {
        const course = await ctx.db.get(t.courseId);
        const topEntries = await ctx.db
          .query("leaderboard")
          .withIndex("by_tournamentId_and_rank", (q) => q.eq("tournamentId", t._id))
          .order("asc")
          .take(3);

        const leaders = await Promise.all(
          topEntries.map(async (entry) => {
            const player = await ctx.db.get(entry.playerId);
            return {
              rank: entry.rank,
              rankDisplay: entry.rankDisplay ?? String(entry.rank),
              displayName: player?.displayName ?? "Unknown",
              scoreToPar: entry.scoreToPar,
              holesCompleted: entry.holesCompleted,
            };
          })
        );

        return {
          tournamentId: t._id,
          name: t.name,
          format: t.format,
          courseName: course?.name ?? "—",
          participantCount: t.participantCount,
          startDate: t.startDate,
          leaders,
        };
      })
    );

    return enriched;
  },
});

/** Score distribution: birdie/eagle/bogey counts across all active scorecards */
export const scoreDistribution = query({
  args: { tournamentId: v.optional(v.id("tournaments")) },
  handler: async (ctx, args) => {
    let holes;
    if (args.tournamentId) {
      const scorecards = await ctx.db
        .query("scorecards")
        .withIndex("by_tournamentId", (q) => q.eq("tournamentId", args.tournamentId!))
        .take(256);

      const allHoles = await Promise.all(
        scorecards.map((sc) =>
          ctx.db
            .query("scorecard_holes")
            .withIndex("by_scorecardId", (q) => q.eq("scorecardId", sc._id))
            .take(18)
        )
      );
      holes = allHoles.flat();
    } else {
      holes = await ctx.db.query("scorecard_holes").take(5000);
    }

    const dist = {
      eagles: holes.filter((h) => h.isEagle).length,
      birdies: holes.filter((h) => h.isBirdie && !h.isEagle).length,
      pars: holes.filter((h) => h.grossScoreToPar === 0).length,
      bogeys: holes.filter((h) => h.isBogey).length,
      doubleBogeys: holes.filter((h) => h.isDoubleBogey).length,
      triplePlus: holes.filter((h) => (h.grossScoreToPar ?? 0) >= 3).length,
      totalHoles: holes.length,
    };

    return dist;
  },
});

/** Admin user list with pagination */
export const userList = query({
  args: {
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/**
 * Recent matches summary — last 10 matches with tournament + player count.
 * Used by MatchSummary dashboard component.
 */
export const recentMatches = query({
  args: {},
  handler: async (ctx) => {
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_scheduledDate")
      .order("desc")
      .take(10);

    const enriched = await Promise.all(
      matches.map(async (match) => {
        const tournament = await ctx.db.get(match.tournamentId);
        const course = tournament ? await ctx.db.get(tournament.courseId) : null;
        const scorecards = await ctx.db
          .query("scorecards")
          .withIndex("by_matchId", (q) => q.eq("matchId", match._id))
          .take(10);

        return {
          matchId: match._id,
          tournamentName: tournament?.name ?? "Unknown",
          courseName: course?.name ?? "Unknown",
          roundNumber: match.roundNumber,
          flightName: match.flightName,
          status: match.status,
          scheduledDate: match.scheduledDate,
          startedAt: match.startedAt,
          completedAt: match.completedAt,
          playerCount: scorecards.length,
        };
      })
    );

    return enriched;
  },
});

/**
 * Top players by leaderboard rank across all completed tournaments.
 * Used by BestPlayer dashboard component.
 */
export const topPlayers = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 5, 20);

    // Get completed tournaments
    const completedTournaments = await ctx.db
      .query("tournaments")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .take(20);

    // Also include ongoing
    const ongoingTournaments = await ctx.db
      .query("tournaments")
      .withIndex("by_status", (q) => q.eq("status", "ongoing"))
      .take(10);

    const allTournaments = [...ongoingTournaments, ...completedTournaments];
    if (allTournaments.length === 0) return [];

    // Aggregate wins per player across tournaments
    const playerWins = new Map<string, {
      playerId: string;
      displayName: string;
      wins: number;
      totalStrokes: number;
      rounds: number;
      handicapIndex?: number;
    }>();

    for (const tournament of allTournaments) {
      const topEntries = await ctx.db
        .query("leaderboard")
        .withIndex("by_tournamentId_and_rank", (q) => q.eq("tournamentId", tournament._id))
        .order("asc")
        .take(limit * 3);

      for (const entry of topEntries) {
        const player = await ctx.db.get(entry.playerId);
        if (!player) continue;

        const key = player._id;
        const existing = playerWins.get(key);
        const isWinner = entry.rank === 1 && !entry.isWithdrawn && !entry.isDisqualified;

        if (existing) {
          existing.wins += isWinner ? 1 : 0;
          existing.totalStrokes += entry.totalStrokes;
          existing.rounds += 1;
        } else {
          playerWins.set(key, {
            playerId: player._id,
            displayName: player.displayName,
            wins: isWinner ? 1 : 0,
            totalStrokes: entry.totalStrokes,
            rounds: 1,
            handicapIndex: player.handicapIndex,
          });
        }
      }
    }

    // Sort by wins desc, then by average score asc
    const sorted = Array.from(playerWins.values())
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        const avgA = a.rounds > 0 ? a.totalStrokes / a.rounds : 9999;
        const avgB = b.rounds > 0 ? b.totalStrokes / b.rounds : 9999;
        return avgA - avgB;
      })
      .slice(0, limit);

    return sorted.map((p, i) => ({
      rank: i + 1,
      playerId: p.playerId,
      displayName: p.displayName,
      wins: p.wins,
      averageScore: p.rounds > 0 ? Math.round((p.totalStrokes / p.rounds) * 10) / 10 : 0,
      rounds: p.rounds,
      handicapIndex: p.handicapIndex,
    }));
  },
});

/**
 * Best hole performances — holes with most eagles/birdies.
 * Used by BestHolePerformance dashboard component.
 */
export const bestHolePerformances = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 5, 20);

    // Get recent scorecard holes with eagles/birdies
    const eagleHoles = await ctx.db
      .query("scorecard_holes")
      .take(2000);

    // Aggregate by hole number
    const holeStats = new Map<number, {
      holeNumber: number;
      eagles: number;
      birdies: number;
      bestScore: number;
      bestPlayerName: string;
      par: number;
    }>();

    for (const h of eagleHoles) {
      if (!h.isEagle && !h.isBirdie) continue;

      const existing = holeStats.get(h.holeNumber);
      const golfHole = await ctx.db.get(h.holeId);
      const par = golfHole?.par ?? 4;

      if (existing) {
        if (h.isEagle) existing.eagles += 1;
        if (h.isBirdie) existing.birdies += 1;
        if (h.strokes < existing.bestScore) {
          existing.bestScore = h.strokes;
          // Get player name for best score
          const sc = await ctx.db.get(h.scorecardId);
          if (sc) {
            const player = await ctx.db.get(sc.playerId);
            existing.bestPlayerName = player?.displayName ?? "Unknown";
          }
        }
      } else {
        const sc = await ctx.db.get(h.scorecardId);
        const player = sc ? await ctx.db.get(sc.playerId) : null;
        holeStats.set(h.holeNumber, {
          holeNumber: h.holeNumber,
          eagles: h.isEagle ? 1 : 0,
          birdies: h.isBirdie ? 1 : 0,
          bestScore: h.strokes,
          bestPlayerName: player?.displayName ?? "Unknown",
          par,
        });
      }
    }

    // Sort by eagles desc, then birdies desc
    const sorted = Array.from(holeStats.values())
      .sort((a, b) => {
        if (b.eagles !== a.eagles) return b.eagles - a.eagles;
        return b.birdies - a.birdies;
      })
      .slice(0, limit);

    return sorted.map((h) => ({
      holeNumber: h.holeNumber,
      par: h.par,
      bestScore: h.bestScore,
      bestPlayerName: h.bestPlayerName,
      result: h.eagles > 0 ? (h.bestScore <= h.par - 3 ? "Albatross" : "Eagle") : "Birdie",
      frequency: h.eagles + h.birdies,
      eagles: h.eagles,
      birdies: h.birdies,
    }));
  },
});

/**
 * Tournament analytics — recent tournaments with stats.
 * Used by TournamentAnalytics and TournamentChart components.
 */
export const tournamentAnalytics = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 5, 20);

    const [completed, ongoing] = await Promise.all([
      ctx.db.query("tournaments").withIndex("by_status", (q) => q.eq("status", "completed")).take(limit),
      ctx.db.query("tournaments").withIndex("by_status", (q) => q.eq("status", "ongoing")).take(5),
    ]);

    const allTournaments = [...ongoing, ...completed].slice(0, limit);

    const enriched = await Promise.all(
      allTournaments.map(async (t) => {
        const matches = await ctx.db
          .query("matches")
          .withIndex("by_tournamentId", (q) => q.eq("tournamentId", t._id))
          .take(50);

        const scorecards = await ctx.db
          .query("scorecards")
          .withIndex("by_tournamentId", (q) => q.eq("tournamentId", t._id))
          .take(256);

        const submittedCards = scorecards.filter(
          (sc) => sc.status === "submitted" || sc.status === "verified"
        );
        const avgScore = submittedCards.length > 0
          ? Math.round(
              submittedCards.reduce((sum, sc) => sum + (sc.totalStrokes ?? 0), 0) /
              submittedCards.length
            )
          : 0;

        // Get winner from leaderboard
        const topEntry = await ctx.db
          .query("leaderboard")
          .withIndex("by_tournamentId_and_rank", (q) => q.eq("tournamentId", t._id))
          .order("asc")
          .take(1);

        let winnerName: string | null = null;
        if (topEntry[0] && t.status === "completed") {
          const player = await ctx.db.get(topEntry[0].playerId);
          winnerName = player?.displayName ?? null;
        }

        const durationDays = Math.max(
          1,
          Math.ceil((t.endDate - t.startDate) / (1000 * 60 * 60 * 24))
        );

        return {
          tournamentId: t._id,
          name: t.name,
          status: t.status,
          format: t.format,
          participants: t.participantCount,
          matchCount: matches.length,
          avgScore,
          durationDays,
          winnerName,
          startDate: t.startDate,
        };
      })
    );

    return enriched;
  },
});
