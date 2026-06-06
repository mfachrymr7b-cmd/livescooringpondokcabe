import { mutation, type MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import {
  createTournamentValidator,
  updateTournamentValidator,
  updateTournamentStatusValidator,
  createMatchValidator,
  updateMatchStatusValidator,
  generateFlightsValidator,
  generateTeeTimesValidator,
  pairPlayersValidator,
} from "../validators";

const DEFAULT_FLIGHT_STATUSES = ["confirmed", "registered"] as const;

type SeedMethod =
  | "registration_order"
  | "handicap_asc"
  | "handicap_desc"
  | "balanced"
  | "random";

type PairingStrategy =
  | "none"
  | "random"
  | "handicap_balanced"
  | "team_balanced"
  | "sequential";

type FlightGenerationArgs = {
  tournamentId: Id<"tournaments">;
  matchId?: Id<"matches">;
  roundNumber: number;
  maxPlayersPerFlight: number;
  namePrefix?: string;
  seedMethod?: SeedMethod;
  pairingStrategy?: PairingStrategy;
  teamSize?: number;
  randomSeed?: number;
  includeStatuses?: Array<"registered" | "confirmed" | "withdrawn" | "disqualified" | "completed">;
  replaceExisting?: boolean;
  userId?: string;
};

async function getCurrentUser(ctx: MutationCtx, fallbackUserId?: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    if (!user) throw new Error("User tidak ditemukan");
    return user;
  }

  // Fallback untuk custom JWT auth (token tidak dikenali Convex)
  if (fallbackUserId) {
    const user = await ctx.db.get(fallbackUserId as Id<"users">);
    if (!user) throw new Error("User tidak ditemukan");
    if (user.status !== "active") throw new Error("Akun tidak aktif");
    return user;
  }

  throw new Error("Unauthenticated");
}

function canManageTournament(user: Doc<"users">, tournament: Doc<"tournaments">) {
  return (
    user.role === "super_admin" ||
    user.role === "club_admin" ||
    user.role === "tournament_admin" ||
    tournament.organizerId === user._id
  );
}

async function assertCanManageTournament(ctx: MutationCtx, tournamentId: Id<"tournaments">, fallbackUserId?: string) {
  const [user, tournament] = await Promise.all([
    getCurrentUser(ctx, fallbackUserId),
    ctx.db.get(tournamentId),
  ]);
  if (!tournament) throw new Error("Turnamen tidak ditemukan");
  if (!canManageTournament(user, tournament)) {
    throw new Error("Tidak punya akses untuk mengelola turnamen ini");
  }
  return { user, tournament };
}

function compactPatch(fields: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) patch[key] = value;
  }
  return patch;
}

function sortPlayers(
  players: Doc<"players">[],
  seedMethod: SeedMethod,
  randomSeed: number
) {
  if (seedMethod === "random") {
    return seededShuffle(players, randomSeed);
  }

  const sorted = [...players];
  if (seedMethod === "registration_order") {
    sorted.sort((a, b) => a.registeredAt - b.registeredAt);
  } else {
    sorted.sort((a, b) => {
      const aHandicap = a.handicapIndex ?? 99;
      const bHandicap = b.handicapIndex ?? 99;
      return seedMethod === "handicap_desc"
        ? bHandicap - aHandicap
        : aHandicap - bHandicap;
    });
  }
  return sorted;
}

function seededRandom(seed: number) {
  let state = Math.abs(Math.floor(seed)) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function seededShuffle(players: Doc<"players">[], seed: number) {
  const random = seededRandom(seed);
  const shuffled = [...players];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = shuffled[index];
    shuffled[index] = shuffled[swapIndex];
    shuffled[swapIndex] = current;
  }
  return shuffled;
}

function buildBalancedGroups(players: Doc<"players">[], groupSize: number) {
  const groups: Doc<"players">[][] = [];
  const groupCount = Math.ceil(players.length / groupSize);
  for (let index = 0; index < groupCount; index += 1) groups.push([]);

  players.forEach((player, index) => {
    const cycle = Math.floor(index / groupCount);
    const position = index % groupCount;
    const target = cycle % 2 === 0 ? position : groupCount - 1 - position;
    groups[target].push(player);
  });

  return groups.filter((group) => group.length > 0);
}

function buildSequentialGroups(players: Doc<"players">[], groupSize: number) {
  const groups: Doc<"players">[][] = [];
  for (let index = 0; index < players.length; index += groupSize) {
    groups.push(players.slice(index, index + groupSize));
  }
  return groups;
}

function buildPairingOrder(
  players: Doc<"players">[],
  strategy: PairingStrategy,
  _teamSize: number,
  randomSeed: number
) {
  if (strategy === "random") {
    return seededShuffle(players, randomSeed);
  }

  if (strategy === "handicap_balanced" || strategy === "team_balanced") {
    const sorted = [...players].sort(
      (a, b) => (a.handicapIndex ?? 99) - (b.handicapIndex ?? 99)
    );
    const ordered: Doc<"players">[] = [];
    let left = 0;
    let right = sorted.length - 1;

    while (left <= right) {
      ordered.push(sorted[left]);
      if (left !== right) ordered.push(sorted[right]);
      left += 1;
      right -= 1;
    }

    return ordered;
  }

  return [...players];
}

function pairingFields(slotOrder: number, strategy: PairingStrategy, teamSize: number) {
  if (strategy === "none") return {};
  const groupNumber = Math.ceil(slotOrder / teamSize);
  if (strategy === "team_balanced") {
    return { teamNumber: groupNumber };
  }
  return {
    pairNumber: groupNumber,
    teamNumber: groupNumber,
  };
}

async function applyPairingToFlight(
  ctx: MutationCtx,
  flight: Doc<"tournament_flights">,
  strategy: PairingStrategy,
  teamSize: number,
  randomSeed: number
) {
  const slots = await ctx.db
    .query("flight_players")
    .withIndex("by_flightId_and_slotOrder", (q) => q.eq("flightId", flight._id))
    .take(20);

  const players = await Promise.all(
    slots.map(async (slot) => {
      const player = await ctx.db.get(slot.playerId);
      if (!player) throw new Error("Player dalam flight tidak ditemukan");
      return player;
    })
  );

  const orderedPlayers = buildPairingOrder(players, strategy, teamSize, randomSeed);
  const slotByPlayerId = new Map(slots.map((slot) => [slot.playerId, slot]));

  for (let index = 0; index < orderedPlayers.length; index += 1) {
    const player = orderedPlayers[index];
    const existingSlot = slotByPlayerId.get(player._id);
    if (!existingSlot) throw new Error("Slot player tidak ditemukan");

    const slotOrder = index + 1;
    await ctx.db.replace(existingSlot._id, {
      tournamentId: existingSlot.tournamentId,
      flightId: existingSlot.flightId,
      playerId: existingSlot.playerId,
      slotOrder,
      ...pairingFields(slotOrder, strategy, teamSize),
      assignedAt: existingSlot.assignedAt,
    });
  }

  await ctx.db.patch(flight._id, {
    pairingStrategy: strategy,
    teamSize,
  });
}

async function deleteExistingFlights(
  ctx: MutationCtx,
  tournamentId: Id<"tournaments">,
  roundNumber: number
) {
  const existingFlights = await ctx.db
    .query("tournament_flights")
    .withIndex("by_tournamentId_and_roundNumber", (q) =>
      q.eq("tournamentId", tournamentId).eq("roundNumber", roundNumber)
    )
    .take(200);

  for (const flight of existingFlights) {
    const members = await ctx.db
      .query("flight_players")
      .withIndex("by_flightId", (q) => q.eq("flightId", flight._id))
      .take(200);
    for (const member of members) {
      await ctx.db.delete(member._id);
    }
    await ctx.db.delete(flight._id);
  }
}

async function deleteExistingTeeTimes(
  ctx: MutationCtx,
  tournamentId: Id<"tournaments">,
  roundNumber: number
) {
  const existingTeeTimes = await ctx.db
    .query("tee_times")
    .withIndex("by_tournamentId_and_roundNumber", (q) =>
      q.eq("tournamentId", tournamentId).eq("roundNumber", roundNumber)
    )
    .take(200);

  for (const teeTime of existingTeeTimes) {
    const slots = await ctx.db
      .query("tee_time_slots")
      .withIndex("by_teeTimeId", (q) => q.eq("teeTimeId", teeTime._id))
      .take(20);
    for (const slot of slots) {
      await ctx.db.delete(slot._id);
    }
    await ctx.db.delete(teeTime._id);
  }
}

function teeStartingHole(baseHole: number, index: number, shotgun: boolean) {
  if (!shotgun) return baseHole;
  return ((baseHole - 1 + index) % 18) + 1;
}

/** Buat turnamen baru */
export const create = mutation({
  args: {
    ...createTournamentValidator,
    organizerId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Coba ambil user dari ctx.auth (jika ada), fallback ke organizerId arg
    let organizerId: Id<"users">;

    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_tokenIdentifier", (q) =>
          q.eq("tokenIdentifier", identity.tokenIdentifier)
        )
        .unique();
      if (!user) throw new Error("User tidak ditemukan");
      organizerId = user._id;
    } else if (args.organizerId) {
      // Fallback: custom JWT auth — organizerId dikirim dari frontend
      const user = await ctx.db.get(args.organizerId);
      if (!user) throw new Error("User tidak ditemukan");
      if (user.status !== "active") throw new Error("Akun tidak aktif");
      organizerId = user._id;
    } else {
      throw new Error("Unauthenticated");
    }

    const course = await ctx.db.get(args.courseId);
    if (!course) throw new Error("Golf course tidak ditemukan");

    const existing = await ctx.db
      .query("tournaments")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) throw new Error(`Slug "${args.slug}" sudah dipakai`);

    const { organizerId: _ignored, ...rest } = args;
    return await ctx.db.insert("tournaments", {
      ...rest,
      organizerId,
      status: "draft",
      participantCount: 0,
    });
  },
});

/** Update status turnamen */
export const updateStatus = mutation({
  args: updateTournamentStatusValidator,
  handler: async (ctx, args) => {
    await assertCanManageTournament(ctx, args.id, args.userId);
    await ctx.db.patch(args.id, { status: args.status });
  },
});

/** Update info turnamen */
export const update = mutation({
  args: updateTournamentValidator,
  handler: async (ctx, args) => {
    const { id, userId, ...fields } = args;
    const { tournament } = await assertCanManageTournament(ctx, id, userId);

    if (fields.courseId) {
      const course = await ctx.db.get(fields.courseId);
      if (!course) throw new Error("Golf course tidak ditemukan");
    }

    if (fields.slug && fields.slug !== tournament.slug) {
      const existing = await ctx.db
        .query("tournaments")
        .withIndex("by_slug", (q) => q.eq("slug", fields.slug!))
        .unique();
      if (existing) throw new Error(`Slug "${fields.slug}" sudah dipakai`);
    }

    await ctx.db.patch(id, compactPatch(fields));
  },
});

/** Buat match dalam turnamen */
export const createMatch = mutation({
  args: createMatchValidator,
  handler: async (ctx, args) => {
    const { userId, ...matchFields } = args;
    await assertCanManageTournament(ctx, args.tournamentId, userId);
    return await ctx.db.insert("matches", {
      ...matchFields,
      status: "scheduled",
    });
  },
});

/** Update status match */
export const updateMatchStatus = mutation({
  args: updateMatchStatusValidator,
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.id);
    if (!match) throw new Error("Match tidak ditemukan");
    await assertCanManageTournament(ctx, match.tournamentId, args.userId);

    const patch: Record<string, unknown> = { status: args.status };
    if (args.status === "ongoing") patch.startedAt = Date.now();
    if (args.status === "completed") patch.completedAt = Date.now();
    await ctx.db.patch(args.id, patch);

    // Reset semua scorecard saat match dimulai
    if (args.status === "ongoing") {
      await ctx.scheduler.runAfter(0, internal.mutations.scorecards.resetMatchScorecards, {
        matchId: args.id,
      });
    }

    if (args.status === "completed") {
      await ctx.scheduler.runAfter(0, internal.mutations.matches.resolveWinners, {
        tournamentId: match.tournamentId,
      });
    }
  },
});

async function generateFlightsForTournament(ctx: MutationCtx, args: FlightGenerationArgs) {
    await assertCanManageTournament(ctx, args.tournamentId, args.userId);

    if (args.maxPlayersPerFlight < 2 || args.maxPlayersPerFlight > 6) {
      throw new Error("Max players per flight harus antara 2 dan 6");
    }

    const pairingStrategy = args.pairingStrategy ?? "none";
    const teamSize = args.teamSize ?? 2;
    if (pairingStrategy !== "none" && (teamSize < 2 || teamSize > args.maxPlayersPerFlight)) {
      throw new Error("Team size harus minimal 2 dan tidak boleh melebihi ukuran flight");
    }

    const match = args.matchId ? await ctx.db.get(args.matchId) : null;
    if (args.matchId && (!match || match.tournamentId !== args.tournamentId)) {
      throw new Error("Match tidak ditemukan untuk turnamen ini");
    }

    const existingFlights = await ctx.db
      .query("tournament_flights")
      .withIndex("by_tournamentId_and_roundNumber", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("roundNumber", args.roundNumber)
      )
      .take(1);
    if (existingFlights.length > 0 && !args.replaceExisting) {
      throw new Error("Flight sudah ada. Gunakan replaceExisting untuk regenerate.");
    }
    if (existingFlights.length > 0) {
      await deleteExistingFlights(ctx, args.tournamentId, args.roundNumber);
    }

    const statuses = args.includeStatuses ?? [...DEFAULT_FLIGHT_STATUSES];
    const playerMap = new Map<Id<"players">, Doc<"players">>();
    for (const status of statuses) {
      const rows = await ctx.db
        .query("players")
        .withIndex("by_tournamentId_and_status", (q) =>
          q.eq("tournamentId", args.tournamentId).eq("status", status)
        )
        .take(256);
      for (const player of rows) playerMap.set(player._id, player);
    }

    const seedMethod = args.seedMethod ?? "balanced";
    const randomSeed = args.randomSeed ?? Date.now();
    const sortedPlayers = sortPlayers([...playerMap.values()], seedMethod, randomSeed);
    const groups =
      seedMethod === "balanced"
        ? buildBalancedGroups(sortedPlayers, args.maxPlayersPerFlight)
        : buildSequentialGroups(sortedPlayers, args.maxPlayersPerFlight);

    const generatedAt = Date.now();
    const namePrefix = args.namePrefix ?? "Flight";
    const flightIds: Id<"tournament_flights">[] = [];

    for (let index = 0; index < groups.length; index += 1) {
      const flightId = await ctx.db.insert("tournament_flights", {
        tournamentId: args.tournamentId,
        ...(args.matchId ? { matchId: args.matchId } : {}),
        roundNumber: args.roundNumber,
        name: `${namePrefix} ${String.fromCharCode(65 + index)}`,
        sequence: index + 1,
        maxPlayers: args.maxPlayersPerFlight,
        status: "generated",
        seedMethod,
        pairingStrategy,
        ...(pairingStrategy === "none" ? {} : { teamSize }),
        generatedAt,
      });
      flightIds.push(flightId);

      const pairedGroup = buildPairingOrder(
        groups[index],
        pairingStrategy,
        teamSize,
        randomSeed + index + 1
      );

      for (let slotIndex = 0; slotIndex < pairedGroup.length; slotIndex += 1) {
        const slotOrder = slotIndex + 1;
        await ctx.db.insert("flight_players", {
          tournamentId: args.tournamentId,
          flightId,
          playerId: pairedGroup[slotIndex]._id,
          slotOrder,
          ...pairingFields(slotOrder, pairingStrategy, teamSize),
          assignedAt: generatedAt,
        });
      }
    }

    return {
      flightIds,
      flightCount: flightIds.length,
      playerCount: sortedPlayers.length,
      pairingStrategy,
      teamSize: pairingStrategy === "none" ? null : teamSize,
    };
}

/** Generate flights dan assign player ke flight */
export const generateFlights = mutation({
  args: generateFlightsValidator,
  handler: async (ctx, args) => {
    return await generateFlightsForTournament(ctx, args);
  },
});

/** Generate match group dengan pairing strategy */
export const generateMatchGroups = mutation({
  args: generateFlightsValidator,
  handler: async (ctx, args) => {
    return await generateFlightsForTournament(ctx, args);
  },
});

/** Pair players ulang di flight yang sudah ada */
export const pairPlayers = mutation({
  args: pairPlayersValidator,
  handler: async (ctx, args) => {
    await assertCanManageTournament(ctx, args.tournamentId, args.userId);

    const flights = await ctx.db
      .query("tournament_flights")
      .withIndex("by_tournamentId_and_roundNumber_and_sequence", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("roundNumber", args.roundNumber)
      )
      .take(200);

    if (flights.length === 0) {
      throw new Error("Belum ada flight untuk ronde ini");
    }

    const teamSize = args.teamSize ?? 2;
    const randomSeed = args.randomSeed ?? Date.now();
    for (let index = 0; index < flights.length; index += 1) {
      if (teamSize < 2 || teamSize > flights[index].maxPlayers) {
        throw new Error("Team size harus minimal 2 dan tidak boleh melebihi ukuran flight");
      }

      await applyPairingToFlight(
        ctx,
        flights[index],
        args.pairingStrategy,
        teamSize,
        randomSeed + index + 1
      );
    }

    return {
      flightCount: flights.length,
      pairingStrategy: args.pairingStrategy,
      teamSize,
    };
  },
});

/** Generate tee times dari flight yang sudah dibuat */
export const generateTeeTimes = mutation({
  args: generateTeeTimesValidator,
  handler: async (ctx, args) => {
    await assertCanManageTournament(ctx, args.tournamentId, args.userId);

    const match = await ctx.db.get(args.matchId);
    if (!match || match.tournamentId !== args.tournamentId) {
      throw new Error("Match tidak ditemukan untuk turnamen ini");
    }

    if (args.intervalMinutes < 1) {
      throw new Error("Interval tee time minimal 1 menit");
    }

    const existingTeeTimes = await ctx.db
      .query("tee_times")
      .withIndex("by_tournamentId_and_roundNumber", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("roundNumber", args.roundNumber)
      )
      .take(1);
    if (existingTeeTimes.length > 0 && !args.replaceExisting) {
      throw new Error("Tee time sudah ada. Gunakan replaceExisting untuk regenerate.");
    }
    if (existingTeeTimes.length > 0) {
      await deleteExistingTeeTimes(ctx, args.tournamentId, args.roundNumber);
    }

    const flights = await ctx.db
      .query("tournament_flights")
      .withIndex("by_tournamentId_and_roundNumber_and_sequence", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("roundNumber", args.roundNumber)
      )
      .take(200);

    if (flights.length === 0) {
      throw new Error("Belum ada flight untuk ronde ini");
    }

    const teeTimeIds: Id<"tee_times">[] = [];
    const intervalMs = args.intervalMinutes * 60 * 1000;
    const baseHole = args.startingHole ?? match.startingHole;
    const maxPlayers = args.maxPlayersPerTeeTime ?? 4;

    for (let index = 0; index < flights.length; index += 1) {
      const flight = flights[index];
      const scheduledTime = args.firstTeeTime + index * intervalMs;
      const teeTimeId = await ctx.db.insert("tee_times", {
        tournamentId: args.tournamentId,
        matchId: args.matchId,
        flightId: flight._id,
        roundNumber: args.roundNumber,
        scheduledTime,
        startingHole: teeStartingHole(baseHole, index, args.shotgun ?? false),
        status: "scheduled",
        groupName: flight.name,
        maxPlayers,
      });
      teeTimeIds.push(teeTimeId);

      const members = await ctx.db
        .query("flight_players")
        .withIndex("by_flightId_and_slotOrder", (q) => q.eq("flightId", flight._id))
        .take(maxPlayers);

      for (const member of members) {
        await ctx.db.insert("tee_time_slots", {
          teeTimeId,
          playerId: member.playerId,
          tournamentId: args.tournamentId,
          slotOrder: member.slotOrder,
          ...(member.pairNumber !== undefined ? { pairNumber: member.pairNumber } : {}),
          ...(member.teamNumber !== undefined ? { teamNumber: member.teamNumber } : {}),
          assignedAt: Date.now(),
        });
      }

      await ctx.db.patch(flight._id, { status: "scheduled" });
    }

    return {
      teeTimeIds,
      teeTimeCount: teeTimeIds.length,
    };
  },
});

/** Hapus turnamen beserta semua data terkait (hanya untuk status completed/cancelled) */
export const deleteTournament = mutation({
  args: {
    id: v.id("tournaments"),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { tournament } = await assertCanManageTournament(ctx, args.id, args.userId);

    if (tournament.status !== "completed" && tournament.status !== "cancelled") {
      throw new Error("Hanya turnamen yang sudah selesai atau dibatalkan yang bisa dihapus");
    }

    const tid = args.id;

    // Hapus scorecard_holes → scorecards
    const scorecards = await ctx.db
      .query("scorecards")
      .withIndex("by_tournamentId", (q) => q.eq("tournamentId", tid))
      .take(500);
    for (const sc of scorecards) {
      const holes = await ctx.db
        .query("scorecard_holes")
        .withIndex("by_scorecardId", (q) => q.eq("scorecardId", sc._id))
        .take(100);
      for (const h of holes) await ctx.db.delete(h._id);
      await ctx.db.delete(sc._id);
    }

    // Hapus leaderboard
    const leaderboard = await ctx.db
      .query("leaderboard")
      .withIndex("by_tournamentId", (q) => q.eq("tournamentId", tid))
      .take(500);
    for (const lb of leaderboard) await ctx.db.delete(lb._id);

    // Hapus flight_players → tournament_flights
    const flights = await ctx.db
      .query("tournament_flights")
      .withIndex("by_tournamentId", (q) => q.eq("tournamentId", tid))
      .take(200);
    for (const f of flights) {
      const members = await ctx.db
        .query("flight_players")
        .withIndex("by_flightId", (q) => q.eq("flightId", f._id))
        .take(50);
      for (const m of members) await ctx.db.delete(m._id);
      await ctx.db.delete(f._id);
    }

    // Hapus tee_time_slots → tee_times
    const teeTimes = await ctx.db
      .query("tee_times")
      .withIndex("by_tournamentId", (q) => q.eq("tournamentId", tid))
      .take(200);
    for (const tt of teeTimes) {
      const slots = await ctx.db
        .query("tee_time_slots")
        .withIndex("by_teeTimeId", (q) => q.eq("teeTimeId", tt._id))
        .take(50);
      for (const s of slots) await ctx.db.delete(s._id);
      await ctx.db.delete(tt._id);
    }

    // Hapus matches
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_tournamentId", (q) => q.eq("tournamentId", tid))
      .take(100);
    for (const m of matches) await ctx.db.delete(m._id);

    // Hapus players
    const players = await ctx.db
      .query("players")
      .withIndex("by_tournamentId", (q) => q.eq("tournamentId", tid))
      .take(500);
    for (const p of players) await ctx.db.delete(p._id);

    // Hapus notifications terkait
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_tournamentId", (q) => q.eq("tournamentId", tid))
      .take(500);
    for (const n of notifications) await ctx.db.delete(n._id);

    // Hapus turnamen itu sendiri
    await ctx.db.delete(tid);

    return { success: true };
  },
});
