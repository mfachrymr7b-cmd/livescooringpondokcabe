/**
 * ─── Match Play & Team Scoring Subscriptions ──────────────────────────────────
 * Real-time queries for match play display, team standings, and nine-hole breakdowns.
 *
 * Gunakan:
 * - `useQuery(api.subscriptions.matchplay.matchDisplay, { matchId })`
 * - `useQuery(api.subscriptions.matchplay.teamStandings, { tournamentId, roundNumber })`
 * - `useQuery(api.subscriptions.matchplay.nineHoles, { scorecardId })`
 */

import { query } from "../_generated/server";
import { v } from "convex/values";
import {
  buildMatchPlayDisplay,
  calculateFrontNine,
  calculateBackNine,
} from "../lib/teamScoring";

/**
 * Live match play display — for broadcast/leaderboard showing.
 * Shows both players' standings, current status, holes won/lost/halved.
 */
export const matchDisplay = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return null;

    const scorecards = await ctx.db
      .query("scorecards")
      .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
      .take(4);

    if (scorecards.length < 2) return null;

    const [player1Card, player2Card] = scorecards.slice(0, 2);

    const player1 = await ctx.db.get(player1Card.playerId);
    const user1 = player1 ? await ctx.db.get(player1.userId) : null;

    const player2 = await ctx.db.get(player2Card.playerId);
    const user2 = player2 ? await ctx.db.get(player2.userId) : null;

    const displayName1 = player1?.displayName ?? user1?.name ?? "Unknown";
    const displayName2 = player2?.displayName ?? user2?.name ?? "Unknown";

    const display = buildMatchPlayDisplay(
      displayName1,
      player1Card.matchplayHolesWon ?? 0,
      player1Card.matchplayHolesLost ?? 0,
      player1Card.matchplayHolesHalved ?? 0,
      displayName2,
      player2Card.matchplayHolesWon ?? 0,
      player2Card.matchplayHolesLost ?? 0,
      player2Card.matchplayHolesHalved ?? 0,
      match.holesPlayed
    );

    return {
      matchId: args.matchId,
      roundNumber: match.roundNumber,
      flightName: match.flightName,
      status: match.status,
      display,
      matchResult: match.matchResult,
      winner: match.winnerPlayerId,
      updatedAt: Date.now(),
    };
  },
});

/**
 * Team standings for tournament round (best ball, four ball, etc).
 * Useful for team competition leaderboard.
 */
export const teamStandings = query({
  args: {
    tournamentId: v.id("tournaments"),
    roundNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_tournamentId_and_roundNumber", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("roundNumber", args.roundNumber)
      )
      .take(50);

    const teamResults = await Promise.all(
      matches.map(async (match) => {
        const scorecards = await ctx.db
          .query("scorecards")
          .withIndex("by_matchId", (q) => q.eq("matchId", match._id))
          .take(4);

        if (scorecards.length < 2) return null;

        const teams = new Map<number, typeof scorecards>();

        for (const sc of scorecards) {
          const flightPlayer = await ctx.db
            .query("flight_players")
            .withIndex("by_tournamentId_and_playerId", (q) =>
              q.eq("tournamentId", match.tournamentId).eq("playerId", sc.playerId)
            )
            .first();

          const teamNum = flightPlayer?.teamNumber ?? 1;
          if (!teams.has(teamNum)) teams.set(teamNum, []);
          teams.get(teamNum)!.push(sc);
        }

        const teamArray = Array.from(teams.values());
        if (teamArray.length < 2) return null;

        const team1 = teamArray[0];
        const team2 = teamArray[1];

        // Get player names
        const team1Players = await Promise.all(
          team1.map(async (sc) => {
            const p = await ctx.db.get(sc.playerId);
            return p?.displayName ?? "Unknown";
          })
        );

        const team2Players = await Promise.all(
          team2.map(async (sc) => {
            const p = await ctx.db.get(sc.playerId);
            return p?.displayName ?? "Unknown";
          })
        );

        const team1Total =
          team1.reduce((sum, sc) => sum + (sc.totalStrokes ?? 0), 0) -
          team1.reduce((sum, sc) => sum + (sc.matchplayHolesWon ?? 0), 0) * 2;

        const team2Total =
          team2.reduce((sum, sc) => sum + (sc.totalStrokes ?? 0), 0) -
          team2.reduce((sum, sc) => sum + (sc.matchplayHolesWon ?? 0), 0) * 2;

        return {
          matchId: match._id,
          flightName: match.flightName,
          team1: {
            players: team1Players,
            holesWon: team1.reduce((sum, sc) => sum + (sc.matchplayHolesWon ?? 0), 0),
            totalScore: team1Total,
          },
          team2: {
            players: team2Players,
            holesWon: team2.reduce((sum, sc) => sum + (sc.matchplayHolesWon ?? 0), 0),
            totalScore: team2Total,
          },
          winner:
            team1Total < team2Total
              ? "team1"
              : team1Total > team2Total
                ? "team2"
                : "tied",
        };
      })
    );

    return {
      tournamentId: args.tournamentId,
      roundNumber: args.roundNumber,
      matches: teamResults.filter((r) => r !== null),
      updatedAt: Date.now(),
    };
  },
});

/**
 * Nine-hole breakdown for scorecard.
 * Shows front 9 and back 9 scores separately.
 */
export const nineHoles = query({
  args: { scorecardId: v.id("scorecards") },
  handler: async (ctx, args) => {
    const scorecard = await ctx.db.get(args.scorecardId);
    if (!scorecard) return null;

    const holes = await ctx.db
      .query("scorecard_holes")
      .withIndex("by_scorecardId_and_holeNumber", (q) => q.eq("scorecardId", args.scorecardId))
      .order("asc")
      .take(18);

    const holesData = holes.map((h) => ({
      holeNumber: h.holeNumber,
      strokes: h.strokes,
      netStrokes: h.netStrokes ?? 0,
      grossScoreToPar: h.grossScoreToPar ?? 0,
      stablefordPoints: h.stablefordPoints,
    }));

    const match = scorecard.matchId ? await ctx.db.get(scorecard.matchId) : null;
    const course = match ? await ctx.db.get(match.courseId) : null;

    const frontPar = course?.par ? Math.ceil(course.par / 2) : 36;
    const backPar = course?.par ? Math.floor(course.par / 2) : 36;

    const frontNine = calculateFrontNine(holesData, frontPar);
    const backNine = calculateBackNine(holesData, backPar);

    return {
      scorecardId: args.scorecardId,
      frontNine,
      backNine,
      total: {
        strokes: scorecard.totalStrokes,
        netStrokes: scorecard.totalNetScore,
        stablefordPoints: scorecard.totalStablefordPoints,
      },
      holesCount: holes.length,
      updatedAt: Date.now(),
    };
  },
});

/**
 * Match play head-to-head comparison with nine-hole breakdown.
 * Perfect for detailed match display or detailed scorecard.
 */
export const matchPlayComparison = query({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return null;

    const scorecards = await ctx.db
      .query("scorecards")
      .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
      .take(4);

    if (scorecards.length < 2) return null;

    const [player1Card, player2Card] = scorecards.slice(0, 2);

    const player1Holes = await ctx.db
      .query("scorecard_holes")
      .withIndex("by_scorecardId_and_holeNumber", (q) => q.eq("scorecardId", player1Card._id))
      .order("asc")
      .take(18);

    const player2Holes = await ctx.db
      .query("scorecard_holes")
      .withIndex("by_scorecardId_and_holeNumber", (q) => q.eq("scorecardId", player2Card._id))
      .order("asc")
      .take(18);

    const player1 = await ctx.db.get(player1Card.playerId);
    const player2 = await ctx.db.get(player2Card.playerId);

    const user1 = player1 ? await ctx.db.get(player1.userId) : null;
    const user2 = player2 ? await ctx.db.get(player2.userId) : null;

    // Convert hole format
    const p1Holes = player1Holes.map((h) => ({
      holeNumber: h.holeNumber,
      netStrokes: h.netStrokes ?? 0,
      strokes: h.strokes,
      grossScoreToPar: h.grossScoreToPar ?? 0,
    }));

    const p2Holes = player2Holes.map((h) => ({
      holeNumber: h.holeNumber,
      netStrokes: h.netStrokes ?? 0,
      strokes: h.strokes,
      grossScoreToPar: h.grossScoreToPar ?? 0,
    }));

    // Front/back nine
    const course = await ctx.db.get(match.courseId);
    const frontPar = course?.par ? Math.ceil(course.par / 2) : 36;
    const backPar = course?.par ? Math.floor(course.par / 2) : 36;

    const p1Front = calculateFrontNine(p1Holes, frontPar);
    const p1Back = calculateBackNine(p1Holes, backPar);
    const p2Front = calculateFrontNine(p2Holes, frontPar);
    const p2Back = calculateBackNine(p2Holes, backPar);

    return {
      matchId: args.matchId,
      players: [
        {
          name: player1?.displayName ?? user1?.name ?? "Unknown",
          bibNumber: player1?.bibNumber,
          front9: p1Front,
          back9: p1Back,
          total: {
            strokes: player1Card.totalStrokes,
            netStrokes: player1Card.totalNetScore,
            scoreToPar: player1Card.scoreToPar,
          },
          matchplayHolesWon: player1Card.matchplayHolesWon,
          matchplayHolesLost: player1Card.matchplayHolesLost,
          matchplayHolesHalved: player1Card.matchplayHolesHalved,
          standing: player1Card.matchplayStanding,
        },
        {
          name: player2?.displayName ?? user2?.name ?? "Unknown",
          bibNumber: player2?.bibNumber,
          front9: p2Front,
          back9: p2Back,
          total: {
            strokes: player2Card.totalStrokes,
            netStrokes: player2Card.totalNetScore,
            scoreToPar: player2Card.scoreToPar,
          },
          matchplayHolesWon: player2Card.matchplayHolesWon,
          matchplayHolesLost: player2Card.matchplayHolesLost,
          matchplayHolesHalved: player2Card.matchplayHolesHalved,
          standing: player2Card.matchplayStanding,
        },
      ],
      matchStatus: match.status,
      matchResult: match.matchResult,
      winner: match.winnerPlayerId,
      updatedAt: Date.now(),
    };
  },
});
