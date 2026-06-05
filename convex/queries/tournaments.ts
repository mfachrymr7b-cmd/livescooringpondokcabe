import { query } from "../_generated/server";
import { v } from "convex/values";

/** Get tournament by ID */
export const get = query({
  args: { id: v.id("tournaments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/** Get tournament by slug */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tournaments")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

/** List tournaments by status, paginated */
export const listByStatus = query({
  args: {
    status: v.union(
      v.literal("draft"),
      v.literal("registration_open"),
      v.literal("registration_closed"),
      v.literal("ongoing"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tournaments")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/** List upcoming tournaments (registration_open + ongoing) */
export const listUpcoming = query({
  args: {
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tournaments")
      .withIndex("by_status", (q) => q.eq("status", "registration_open"))
      .order("asc")
      .paginate(args.paginationOpts);
  },
});

/** List all tournaments across all statuses, ordered by startDate desc */
export const listAll = query({
  args: {
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tournaments")
      .withIndex("by_startDate")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/** List matches dalam satu turnamen */
export const getMatches = query({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("matches")
      .withIndex("by_tournamentId", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .order("asc")
      .take(20);
  },
});

/** Get match by ID */
export const getMatch = query({
  args: { id: v.id("matches") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/** List flights dalam satu ronde turnamen */
export const listFlights = query({
  args: {
    tournamentId: v.id("tournaments"),
    roundNumber: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tournament_flights")
      .withIndex("by_tournamentId_and_roundNumber_and_sequence", (q) =>
        q
          .eq("tournamentId", args.tournamentId)
          .eq("roundNumber", args.roundNumber)
      )
      .take(200);
  },
});

/** Get flight lengkap dengan player assignments */
export const getFlightWithPlayers = query({
  args: { id: v.id("tournament_flights") },
  handler: async (ctx, args) => {
    const flight = await ctx.db.get(args.id);
    if (!flight) return null;

    const slots = await ctx.db
      .query("flight_players")
      .withIndex("by_flightId_and_slotOrder", (q) => q.eq("flightId", args.id))
      .take(12);

    const players = await Promise.all(
      slots.map(async (slot) => {
        const player = await ctx.db.get(slot.playerId);
        const user = player ? await ctx.db.get(player.userId) : null;
        return { ...slot, player, user };
      })
    );

    return { ...flight, players };
  },
});
