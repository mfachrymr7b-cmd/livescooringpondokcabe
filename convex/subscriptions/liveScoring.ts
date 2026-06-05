/**
 * ─── Live Scoring Subscriptions ──────────────────────────────────────────────
 * Real-time queries untuk tampilan live scoring ala Flashscore.
 * Menampilkan skor per hole untuk semua player dalam satu turnamen.
 */

import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Live leaderboard dengan skor per hole untuk semua player.
 * Digunakan di halaman live scoring publik (Flashscore-style).
 * Mengembalikan data leaderboard + hole scores per player.
 */
export const leaderboardWithHoles = query({
  args: {
    tournamentId: v.id("tournaments"),
    roundNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) return null;

    // Ambil course holes untuk par info
    const courseHoles = await ctx.db
      .query("golf_holes")
      .withIndex("by_courseId", (q) => q.eq("courseId", tournament.courseId))
      .take(18);
    const sortedCourseHoles = [...courseHoles].sort((a, b) => a.holeNumber - b.holeNumber);

    // Ambil leaderboard entries
    const leaderboard = await ctx.db
      .query("leaderboard")
      .withIndex("by_tournamentId_and_rank", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .order("asc")
      .take(200);

    // Ambil scorecards untuk ronde ini
    const scorecards = await ctx.db
      .query("scorecards")
      .withIndex("by_tournamentId_and_roundNumber", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("roundNumber", args.roundNumber)
      )
      .take(256);

    const scorecardByPlayerId = new Map(scorecards.map((sc) => [sc.playerId, sc]));

    const enriched = await Promise.all(
      leaderboard.map(async (entry) => {
        const player = await ctx.db.get(entry.playerId);
        const user = player ? await ctx.db.get(player.userId) : null;

        const scorecard = scorecardByPlayerId.get(entry.playerId);
        let holeScores: Array<{
          holeNumber: number;
          strokes: number;
          grossScoreToPar: number | undefined;
          netScoreToPar: number | undefined;
          stablefordPoints: number | undefined;
          isBirdie: boolean | undefined;
          isEagle: boolean | undefined;
          isBogey: boolean | undefined;
          isDoubleBogey: boolean | undefined;
        }> = [];

        if (scorecard) {
          const holes = await ctx.db
            .query("scorecard_holes")
            .withIndex("by_scorecardId_and_holeNumber", (q) =>
              q.eq("scorecardId", scorecard._id)
            )
            .order("asc")
            .take(18);

          holeScores = holes.map((h) => ({
            holeNumber: h.holeNumber,
            strokes: h.strokes,
            grossScoreToPar: h.grossScoreToPar,
            netScoreToPar: h.netScoreToPar,
            stablefordPoints: h.stablefordPoints,
            isBirdie: h.isBirdie,
            isEagle: h.isEagle,
            isBogey: h.isBogey,
            isDoubleBogey: h.isDoubleBogey,
          }));
        }

        return {
          rank: entry.rank,
          rankDisplay: entry.rankDisplay ?? String(entry.rank),
          isTied: entry.isTied,
          playerId: entry.playerId,
          displayName: player?.displayName ?? user?.name ?? "Unknown",
          avatarUrl: user?.avatarUrl,
          bibNumber: player?.bibNumber,
          handicapIndex: player?.handicapIndex,
          totalStrokes: entry.totalStrokes,
          totalNetScore: entry.totalNetScore,
          scoreToPar: entry.scoreToPar,
          totalStablefordPoints: entry.totalStablefordPoints,
          holesCompleted: entry.holesCompleted,
          currentRound: entry.currentRound,
          isWithdrawn: entry.isWithdrawn,
          isDisqualified: entry.isDisqualified,
          holeScores,
          updatedAt: entry.updatedAt,
        };
      })
    );

    return {
      tournament: {
        _id: tournament._id,
        name: tournament.name,
        format: tournament.format,
        status: tournament.status,
        holesPerRound: tournament.holesPerRound,
        totalRounds: tournament.totalRounds,
        useHandicap: tournament.useHandicap,
        startDate: tournament.startDate,
        prizePool: tournament.prizePool,
        currency: tournament.currency,
      },
      courseHoles: sortedCourseHoles.map((h) => ({
        holeNumber: h.holeNumber,
        par: h.par,
        strokeIndex: h.strokeIndex,
      })),
      roundNumber: args.roundNumber,
      players: enriched,
      updatedAt: Date.now(),
    };
  },
});

/**
 * Live scoring untuk satu match — semua player dengan hole-by-hole scores.
 * Digunakan di halaman live match scoring.
 */
export const matchScoringGrid = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return null;

    const tournament = await ctx.db.get(match.tournamentId);
    if (!tournament) return null;

    // Course holes
    const courseHoles = await ctx.db
      .query("golf_holes")
      .withIndex("by_courseId", (q) => q.eq("courseId", match.courseId))
      .take(18);
    const sortedCourseHoles = [...courseHoles].sort((a, b) => a.holeNumber - b.holeNumber);

    // Scorecards dalam match ini
    const scorecards = await ctx.db
      .query("scorecards")
      .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
      .take(100);

    const players = await Promise.all(
      scorecards.map(async (sc) => {
        const player = await ctx.db.get(sc.playerId);
        const user = player ? await ctx.db.get(player.userId) : null;

        const holes = await ctx.db
          .query("scorecard_holes")
          .withIndex("by_scorecardId_and_holeNumber", (q) => q.eq("scorecardId", sc._id))
          .order("asc")
          .take(18);

        return {
          scorecardId: sc._id,
          playerId: sc.playerId,
          displayName: player?.displayName ?? user?.name ?? "Unknown",
          bibNumber: player?.bibNumber,
          handicapIndex: player?.handicapIndex,
          playingHandicap: sc.playingHandicap,
          status: sc.status,
          totalStrokes: sc.totalStrokes,
          totalNetScore: sc.totalNetScore,
          scoreToPar: sc.scoreToPar,
          totalStablefordPoints: sc.totalStablefordPoints,
          matchplayStanding: sc.matchplayStanding,
          matchOutcome: sc.matchOutcome,
          isMatchWinner: sc.isMatchWinner,
          holesCompleted: holes.length,
          holeScores: holes.map((h) => ({
            holeNumber: h.holeNumber,
            strokes: h.strokes,
            putts: h.putts,
            penaltyStrokes: h.penaltyStrokes,
            netStrokes: h.netStrokes,
            grossScoreToPar: h.grossScoreToPar,
            netScoreToPar: h.netScoreToPar,
            stablefordPoints: h.stablefordPoints,
            matchplayPoints: h.matchplayPoints,
            isBirdie: h.isBirdie,
            isEagle: h.isEagle,
            isBogey: h.isBogey,
            isDoubleBogey: h.isDoubleBogey,
          })),
        };
      })
    );

    return {
      matchId: args.matchId,
      tournamentId: match.tournamentId,
      tournamentName: tournament.name,
      format: tournament.format,
      roundNumber: match.roundNumber,
      flightName: match.flightName,
      status: match.status,
      scheduledDate: match.scheduledDate,
      holesPlayed: match.holesPlayed,
      startingHole: match.startingHole,
      courseHoles: sortedCourseHoles.map((h) => ({
        holeNumber: h.holeNumber,
        par: h.par,
        strokeIndex: h.strokeIndex,
      })),
      players,
      updatedAt: Date.now(),
    };
  },
});

/**
 * Public tournament overview — tidak butuh auth.
 * Untuk halaman live scoring publik.
 */
export const publicTournamentList = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const ongoing = await ctx.db
      .query("tournaments")
      .withIndex("by_status", (q) => q.eq("status", "ongoing"))
      .order("desc")
      .take(20);

    const registrationClosed = await ctx.db
      .query("tournaments")
      .withIndex("by_status", (q) => q.eq("status", "registration_closed"))
      .order("desc")
      .take(20);

    const registrationOpen = await ctx.db
      .query("tournaments")
      .withIndex("by_status", (q) => q.eq("status", "registration_open"))
      .order("desc")
      .take(20);

    const completed = await ctx.db
      .query("tournaments")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .order("desc")
      .take(10);

    const enrichTournament = async (
      t: Awaited<ReturnType<typeof ctx.db.get<"tournaments">>>,
      isLive = false
    ) => {
      if (!t) return null;
      const course = await ctx.db.get(t.courseId);
      return {
        _id: t._id,
        name: t.name,
        slug: t.slug,
        format: t.format,
        status: t.status,
        isLive,
        startDate: t.startDate,
        endDate: t.endDate,
        holesPerRound: t.holesPerRound,
        totalRounds: t.totalRounds,
        participantCount: t.participantCount,
        courseName: course?.name ?? "Golf Course",
        courseCity: course?.city,
        prizePool: t.prizePool,
        currency: t.currency,
      };
    };

    const [ongoingEnriched, , openEnriched, completedEnriched] = await Promise.all([
      Promise.all(ongoing.map((t) => enrichTournament(t))),
      Promise.all(registrationClosed.map((t) => enrichTournament(t))),
      Promise.all(registrationOpen.map((t) => enrichTournament(t))),
      Promise.all(completed.map((t) => enrichTournament(t))),
    ]);

    const allScheduled = [...registrationClosed, ...registrationOpen];
    const inferredLive = allScheduled.filter(
      (t) => t.startDate <= now && t.endDate >= now
    );
    const inferredLiveById = new Set(inferredLive.map((t) => t._id));
    const inferredLiveEnriched = await Promise.all(
      inferredLive.map((t) => enrichTournament(t, true))
    );

    const scheduledOnly = allScheduled.filter(
      (t) => t.startDate > now && !inferredLiveById.has(t._id)
    );
    const scheduledOnlyEnriched = await Promise.all(
      scheduledOnly.map((t) => enrichTournament(t))
    );

    const uniqueOngoing = new Map<string, NonNullable<Awaited<ReturnType<typeof enrichTournament>>>>();
    ongoingEnriched.forEach((t) => {
      if (t) uniqueOngoing.set(t._id, t);
    });
    inferredLiveEnriched.forEach((t) => {
      if (t) uniqueOngoing.set(t._id, t);
    });

    return {
      ongoing: Array.from(uniqueOngoing.values()).filter(Boolean),
      scheduled: scheduledOnlyEnriched.filter(Boolean),
      registrationOpen: openEnriched.filter(Boolean),
      completed: completedEnriched.filter(Boolean),
    };
  },
});
