import { query, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { userRoleValidator, userStatusValidator } from "../types";
import { paginationOptsValidator } from "convex/server";

/** Get user yang sedang login */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    return user ?? null;
  },
});

/** Get user by ID */
export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/** Get user by email — internal only (email bisa dipakai untuk enumeration) */
export const getByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});

/** List users by role, paginated */
export const listByRole = query({
  args: {
    role: userRoleValidator,
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", args.role))
      .paginate(args.paginationOpts);
  },
});

/** List users by status, paginated */
export const listByStatus = query({
  args: {
    status: userStatusValidator,
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .paginate(args.paginationOpts);
  },
});

/** List users by role + status (misal: semua player aktif), paginated */
export const listByRoleAndStatus = query({
  args: {
    role: userRoleValidator,
    status: userStatusValidator,
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_role_and_status", (q) =>
        q.eq("role", args.role).eq("status", args.status)
      )
      .paginate(args.paginationOpts);
  },
});

/** List semua users, paginated — hanya untuk admin */
export const listAll = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    return await ctx.db.query("users").paginate(args.paginationOpts);
  },
});

/** List active sessions untuk user yang sedang login */
export const mySessions = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    if (!user) return null;

    const now = Date.now();
    const sessions = await ctx.db
      .query("auth_sessions")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(20);

    return sessions
      .filter((s) => !s.revokedAt && s.expiresAt > now)
      .map((s) => ({
        sessionId: s._id,
        userAgent: s.userAgent,
        ipAddress: s.ipAddress,
        lastUsedAt: s.lastUsedAt,
        expiresAt: s.expiresAt,
        createdAt: s._creationTime,
      }));
  },
});
