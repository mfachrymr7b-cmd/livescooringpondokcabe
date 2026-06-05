import { mutation, internalMutation, type MutationCtx } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { type Doc, type Id } from "../_generated/dataModel";
import {
  createScorecardValidator,
  recordHoleScoreValidator,
} from "../validators";
import {
  computeHoleScore,
  formatMatchplayStanding,
  matchplayPointsFromComparison,
} from "../lib/scoring";

/** Buat scorecard baru untuk satu player satu ronde */
export const create = mutation({
  args: createScorecardValidator,
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("scorecards")
      .withIndex("by_matchId_and_playerId", (q) =>
        q.eq("matchId", args.matchId).eq("playerId", args.playerId)
      )
      .unique();

    if (existing) {
      // Reset scorecard yang ada — hapus semua hole scores dan kembalikan ke in_progress
      await _resetScorecard(ctx, existing._id);
      await ctx.db.patch(existing._id, {
        playingHandicap: args.playingHandicap,
        status: "in_progress",
        totalStrokes: undefined,
        totalPutts: undefined,
        totalNetScore: undefined,
        scoreToPar: undefined,
        totalStablefordPoints: undefined,
        matchplayHolesWon: undefined,
        matchplayHolesLost: undefined,
        matchplayHolesHalved: undefined,
        matchplayStanding: undefined,
        matchOutcome: undefined,
        isMatchWinner: undefined,
        submittedAt: undefined,
        verifiedAt: undefined,
        verifiedBy: undefined,
        notes: undefined,
      });

      await ctx.scheduler.runAfter(0, internal.mutations.leaderboard.recalculate, {
        tournamentId: args.tournamentId,
      });

      return existing._id;
    }

    const scorecardId = await ctx.db.insert("scorecards", {
      ...args,
      status: "in_progress",
    });

    await ctx.scheduler.runAfter(0, internal.mutations.leaderboard.recalculate, {
      tournamentId: args.tournamentId,
    });

    return scorecardId;
  },
});

/** Catat atau update skor satu hole */
export const recordHoleScore = mutation({
  args: recordHoleScoreValidator,
  handler: async (ctx, args) => {
    const scorecard = await ctx.db.get(args.scorecardId);
    if (!scorecard) throw new Error("Scorecard tidak ditemukan");
    if (scorecard.status === "verified") throw new Error("Scorecard sudah diverifikasi");

    const hole = await ctx.db.get(args.holeId);
    if (!hole) throw new Error("Hole tidak ditemukan");

    const tournament = await ctx.db.get(scorecard.tournamentId);

    const existing = await ctx.db
      .query("scorecard_holes")
      .withIndex("by_scorecardId_and_holeNumber", (q) =>
        q.eq("scorecardId", args.scorecardId).eq("holeNumber", args.holeNumber)
      )
      .unique();

    const computed = computeHoleScore({
      strokes: args.strokes,
      penaltyStrokes: args.penaltyStrokes,
      par: hole.par,
      strokeIndex: hole.strokeIndex,
      playingHandicap: scorecard.playingHandicap,
    });

    const holeData = {
      scorecardId: args.scorecardId,
      holeId: args.holeId,
      holeNumber: args.holeNumber,
      strokes: args.strokes,
      putts: args.putts,
      penaltyStrokes: args.penaltyStrokes,
      netStrokes: computed.netStrokes,
      handicapStrokes: computed.handicapStrokes,
      grossScoreToPar: computed.grossScoreToPar,
      netScoreToPar: computed.netScoreToPar,
      stablefordPoints: computed.stablefordPoints,
      matchplayPoints: undefined as number | undefined,
      isGir: args.isGir,
      isFairwayHit: args.isFairwayHit,
      isBirdie: computed.isBirdie,
      isEagle: computed.isEagle,
      isBogey: computed.isBogey,
      isDoubleBogey: computed.isDoubleBogey,
      recordedAt: Date.now(),
    };

    let holeDocId: Id<"scorecard_holes">;
    if (existing) {
      await ctx.db.patch(existing._id, holeData);
      holeDocId = existing._id;
    } else {
      holeDocId = await ctx.db.insert("scorecard_holes", holeData);
    }

    if (tournament?.format === "match_play") {
      await _syncMatchplayForHole(ctx, scorecard, args.holeNumber, holeDocId);
    } else if (existing?.matchplayPoints !== undefined) {
      await ctx.db.patch(holeDocId, { matchplayPoints: undefined });
    }

    await _recalculateTotals(ctx, args.scorecardId);

    await ctx.scheduler.runAfter(0, internal.mutations.leaderboard.recalculate, {
      tournamentId: scorecard.tournamentId,
    });

    return args.scorecardId;
  },
});

/** Submit scorecard untuk verifikasi */
export const submit = mutation({
  args: { id: v.id("scorecards") },
  handler: async (ctx, args) => {
    const scorecard = await ctx.db.get(args.id);
    if (!scorecard) throw new Error("Scorecard tidak ditemukan");
    if (scorecard.status !== "in_progress") {
      throw new Error("Hanya scorecard in_progress yang bisa di-submit");
    }

    await ctx.db.patch(args.id, {
      status: "submitted",
      submittedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.mutations.leaderboard.recalculate, {
      tournamentId: scorecard.tournamentId,
    });
  },
});

/** Verifikasi scorecard — hanya admin/marker */
export const verify = mutation({
  args: { id: v.id("scorecards") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const verifier = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    if (!verifier) throw new Error("User tidak ditemukan");

    const scorecard = await ctx.db.get(args.id);
    if (!scorecard) throw new Error("Scorecard tidak ditemukan");
    if (scorecard.status !== "submitted") {
      throw new Error("Hanya scorecard submitted yang bisa diverifikasi");
    }

    await ctx.db.patch(args.id, {
      status: "verified",
      verifiedAt: Date.now(),
      verifiedBy: verifier._id,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.mutations.leaderboard.recalculate,
      { tournamentId: scorecard.tournamentId }
    );
  },
});

/** Tandai scorecard sebagai disputed */
export const dispute = mutation({
  args: { id: v.id("scorecards"), notes: v.string() },
  handler: async (ctx, args) => {
    const scorecard = await ctx.db.get(args.id);
    if (!scorecard) throw new Error("Scorecard tidak ditemukan");

    await ctx.db.patch(args.id, {
      status: "disputed",
      notes: args.notes,
    });
  },
});

export const recalculateTotals = internalMutation({
  args: { scorecardId: v.id("scorecards") },
  handler: async (ctx, args) => {
    await _recalculateTotals(ctx, args.scorecardId);
  },
});

/**
 * Reset semua scorecard dalam satu match.
 * Dipanggil otomatis saat match di-set ke "ongoing".
 */
export const resetMatchScorecards = internalMutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const scorecards = await ctx.db
      .query("scorecards")
      .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
      .take(200);

    for (const sc of scorecards) {
      await _resetScorecard(ctx, sc._id);
      await ctx.db.patch(sc._id, {
        status: "in_progress",
        totalStrokes: undefined,
        totalPutts: undefined,
        totalNetScore: undefined,
        scoreToPar: undefined,
        totalStablefordPoints: undefined,
        matchplayHolesWon: undefined,
        matchplayHolesLost: undefined,
        matchplayHolesHalved: undefined,
        matchplayStanding: undefined,
        matchOutcome: undefined,
        isMatchWinner: undefined,
        submittedAt: undefined,
        verifiedAt: undefined,
        verifiedBy: undefined,
        notes: undefined,
      });
    }

    // Recalculate leaderboard jika ada scorecard yang direset
    if (scorecards.length > 0) {
      const match = await ctx.db.get(args.matchId);
      if (match) {
        await ctx.scheduler.runAfter(0, internal.mutations.leaderboard.recalculate, {
          tournamentId: match.tournamentId,
        });
      }
    }
  },
});

// ─── Private Helpers ──────────────────────────────────────────────────────────

/** Hapus semua scorecard_holes untuk satu scorecard */
async function _resetScorecard(ctx: MutationCtx, scorecardId: Id<"scorecards">) {
  const holes = await ctx.db
    .query("scorecard_holes")
    .withIndex("by_scorecardId", (q) => q.eq("scorecardId", scorecardId))
    .take(18);
  for (const hole of holes) {
    await ctx.db.delete(hole._id);
  }
}

async function _recalculateTotals(ctx: MutationCtx, scorecardId: Id<"scorecards">) {
  const scorecard = await ctx.db.get(scorecardId);
  if (!scorecard) return;

  const holes = await ctx.db
    .query("scorecard_holes")
    .withIndex("by_scorecardId", (q) => q.eq("scorecardId", scorecardId))
    .take(18);

  const totalStrokes = holes.reduce((sum, h) => sum + h.strokes + (h.penaltyStrokes ?? 0), 0);
  const totalPutts = holes.reduce((sum, h) => sum + (h.putts ?? 0), 0);
  const totalNetScore = holes.reduce(
    (sum, h) => sum + (h.netStrokes ?? h.strokes),
    0
  );
  const totalStablefordPoints = holes.reduce(
    (sum, h) => sum + (h.stablefordPoints ?? 0),
    0
  );

  let matchplayHolesWon = 0;
  let matchplayHolesLost = 0;
  let matchplayHolesHalved = 0;
  for (const h of holes) {
    if (h.matchplayPoints === 1) matchplayHolesWon += 1;
    else if (h.matchplayPoints === -1) matchplayHolesLost += 1;
    else if (h.matchplayPoints === 0) matchplayHolesHalved += 1;
  }

  let scoreToPar: number | undefined;
  if (holes.length > 0) {
    const holeDetails = await Promise.all(holes.map((h) => ctx.db.get(h.holeId)));
    const totalPar = holeDetails.reduce((sum, h) => sum + (h?.par ?? 0), 0);
    if (totalPar > 0) scoreToPar = totalStrokes - totalPar;
  }

  const tournament = await ctx.db.get(scorecard.tournamentId);
  const isMatchPlay = tournament?.format === "match_play";
  const hasMatchplayResults = matchplayHolesWon + matchplayHolesLost + matchplayHolesHalved > 0;

  await ctx.db.patch(scorecardId, {
    totalStrokes,
    totalPutts,
    totalNetScore,
    totalStablefordPoints: holes.length > 0 ? totalStablefordPoints : undefined,
    ...(scoreToPar !== undefined ? { scoreToPar } : {}),
    ...(isMatchPlay && hasMatchplayResults
      ? {
          matchplayHolesWon,
          matchplayHolesLost,
          matchplayHolesHalved,
          matchplayStanding: formatMatchplayStanding(matchplayHolesWon, matchplayHolesLost),
        }
      : {
          matchplayHolesWon: undefined,
          matchplayHolesLost: undefined,
          matchplayHolesHalved: undefined,
          matchplayStanding: undefined,
        }),
  });
}

async function _findMatchplayOpponentScorecard(
  ctx: MutationCtx,
  scorecard: Doc<"scorecards">
): Promise<Doc<"scorecards"> | null> {
  const membership = await ctx.db
    .query("flight_players")
    .withIndex("by_tournamentId_and_playerId", (q) =>
      q.eq("tournamentId", scorecard.tournamentId).eq("playerId", scorecard.playerId)
    )
    .take(5);

  const flightPlayer = membership.find((m) => m.pairNumber !== undefined);
  if (!flightPlayer?.pairNumber) return null;

  const flightMates = await ctx.db
    .query("flight_players")
    .withIndex("by_flightId", (q) => q.eq("flightId", flightPlayer.flightId))
    .take(20);

  const opponentSlot = flightMates.find(
    (slot) =>
      slot.playerId !== scorecard.playerId && slot.pairNumber === flightPlayer.pairNumber
  );
  if (!opponentSlot) return null;

  return await ctx.db
    .query("scorecards")
    .withIndex("by_matchId_and_playerId", (q) =>
      q.eq("matchId", scorecard.matchId).eq("playerId", opponentSlot.playerId)
    )
    .unique();
}

async function _getHoleScore(
  ctx: MutationCtx,
  scorecardId: Id<"scorecards">,
  holeNumber: number
) {
  return await ctx.db
    .query("scorecard_holes")
    .withIndex("by_scorecardId_and_holeNumber", (q) =>
      q.eq("scorecardId", scorecardId).eq("holeNumber", holeNumber)
    )
    .unique();
}

async function _syncMatchplayForHole(
  ctx: MutationCtx,
  scorecard: Doc<"scorecards">,
  holeNumber: number,
  playerHoleId: Id<"scorecard_holes">
) {
  const playerHole = await ctx.db.get(playerHoleId);
  if (!playerHole || playerHole.netStrokes === undefined) return;

  const opponentScorecard = await _findMatchplayOpponentScorecard(ctx, scorecard);
  if (!opponentScorecard) {
    await ctx.db.patch(playerHoleId, { matchplayPoints: undefined });
    return;
  }

  const opponentHole = await _getHoleScore(ctx, opponentScorecard._id, holeNumber);
  if (!opponentHole || opponentHole.netStrokes === undefined) {
    await ctx.db.patch(playerHoleId, { matchplayPoints: undefined });
    return;
  }

  const playerPoints = matchplayPointsFromComparison(
    playerHole.netStrokes,
    opponentHole.netStrokes
  );
  const opponentPoints = matchplayPointsFromComparison(
    opponentHole.netStrokes,
    playerHole.netStrokes
  );

  await ctx.db.patch(playerHoleId, { matchplayPoints: playerPoints });
  await ctx.db.patch(opponentHole._id, { matchplayPoints: opponentPoints });

  await _recalculateTotals(ctx, opponentScorecard._id);

  await ctx.scheduler.runAfter(0, internal.mutations.matches.resolveWinners, {
    tournamentId: scorecard.tournamentId,
  });
}
