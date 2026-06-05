/**
 * ─── Auth Helpers (Convex runtime) ───────────────────────────────────────────
 * Internal queries/mutations untuk operasi DB yang dipanggil dari actions.
 * Tidak ada "use node" — ini berjalan di Convex V8 runtime.
 */

import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server";
import { v } from "convex/values";
import { type Id as _Id } from "../_generated/dataModel";
import {
  ACCESS_TOKEN_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
} from "./constants";
import { userRoleValidator, userStatusValidator } from "../types";

// ─── User Lookups ─────────────────────────────────────────────────────────────

export const getUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx: QueryCtx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});

export const getUserById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx: QueryCtx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// ─── User Creation ────────────────────────────────────────────────────────────

export const createUser = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
    name: v.string(),
    role: userRoleValidator,
    clubId: v.optional(v.id("golf_courses")),
  },
  handler: async (ctx: MutationCtx, args) => {
    return await ctx.db.insert("users", {
      email: args.email,
      passwordHash: args.passwordHash,
      name: args.name,
      role: args.role,
      clubId: args.clubId,
      status: "active",
      lastActiveAt: Date.now(),
    });
  },
});

// ─── Session Management ───────────────────────────────────────────────────────

export const createSession = internalMutation({
  args: {
    userId: v.id("users"),
    jti: v.string(),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx: MutationCtx, args) => {
    const now = Date.now();
    return await ctx.db.insert("auth_sessions", {
      userId: args.userId,
      jti: args.jti,
      userAgent: args.userAgent,
      ipAddress: args.ipAddress,
      expiresAt: now + ACCESS_TOKEN_TTL_MS,
      lastUsedAt: now,
    });
  },
});

export const getSessionById = internalQuery({
  args: { sessionId: v.id("auth_sessions") },
  handler: async (ctx: QueryCtx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const getSessionByJti = internalQuery({
  args: { jti: v.string() },
  handler: async (ctx: QueryCtx, args) => {
    return await ctx.db
      .query("auth_sessions")
      .withIndex("by_jti", (q) => q.eq("jti", args.jti))
      .unique();
  },
});

export const revokeSession = internalMutation({
  args: { sessionId: v.id("auth_sessions") },
  handler: async (ctx: MutationCtx, args) => {
    await ctx.db.patch(args.sessionId, { revokedAt: Date.now() });
  },
});

export const getActiveSessionsByUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx: QueryCtx, args) => {
    const now = Date.now();
    const sessions = await ctx.db
      .query("auth_sessions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
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

export const revokeAllUserSessions = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx: MutationCtx, args) => {
    const sessions = await ctx.db
      .query("auth_sessions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .take(100);
    const now = Date.now();
    for (const session of sessions) {
      if (!session.revokedAt) {
        await ctx.db.patch(session._id, { revokedAt: now });
      }
    }
  },
});

export const touchSession = internalMutation({
  args: { sessionId: v.id("auth_sessions") },
  handler: async (ctx: MutationCtx, args) => {
    await ctx.db.patch(args.sessionId, { lastUsedAt: Date.now() });
  },
});

// ─── Refresh Token Management ─────────────────────────────────────────────────

export const createRefreshToken = internalMutation({
  args: {
    userId: v.id("users"),
    sessionId: v.id("auth_sessions"),
    tokenHash: v.string(),
  },
  handler: async (ctx: MutationCtx, args) => {
    return await ctx.db.insert("auth_refresh_tokens", {
      userId: args.userId,
      sessionId: args.sessionId,
      tokenHash: args.tokenHash,
      expiresAt: Date.now() + REFRESH_TOKEN_TTL_MS,
    });
  },
});

export const getRefreshToken = internalQuery({
  args: { tokenHash: v.string() },
  handler: async (ctx: QueryCtx, args) => {
    return await ctx.db
      .query("auth_refresh_tokens")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", args.tokenHash))
      .unique();
  },
});

export const revokeRefreshToken = internalMutation({
  args: {
    tokenId: v.id("auth_refresh_tokens"),
    replacedByHash: v.optional(v.string()),
  },
  handler: async (ctx: MutationCtx, args) => {
    await ctx.db.patch(args.tokenId, {
      revokedAt: Date.now(),
      replacedByTokenHash: args.replacedByHash,
    });
  },
});

export const revokeAllUserRefreshTokens = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx: MutationCtx, args) => {
    const tokens = await ctx.db
      .query("auth_refresh_tokens")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .take(100);
    const now = Date.now();
    for (const token of tokens) {
      if (!token.revokedAt) {
        await ctx.db.patch(token._id, { revokedAt: now });
      }
    }
  },
});

// ─── User Updates ─────────────────────────────────────────────────────────────

export const updateLastActive = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx: MutationCtx, args) => {
    await ctx.db.patch(args.userId, { lastActiveAt: Date.now() });
  },
});

export const updatePassword = internalMutation({
  args: { userId: v.id("users"), passwordHash: v.string() },
  handler: async (ctx: MutationCtx, args) => {
    await ctx.db.patch(args.userId, {
      passwordHash: args.passwordHash,
      passwordChangedAt: Date.now(),
    });
  },
});

export const adminPatchUser = internalMutation({
  args: {
    userId: v.id("users"),
    role: v.optional(userRoleValidator),
    status: v.optional(userStatusValidator),
    clubId: v.optional(v.id("golf_courses")),
  },
  handler: async (ctx: MutationCtx, args) => {
    const { userId, ...fields } = args;
    const patch: Record<string, unknown> = {};
    if (fields.role !== undefined) patch.role = fields.role;
    if (fields.status !== undefined) patch.status = fields.status;
    if (fields.clubId !== undefined) patch.clubId = fields.clubId;
    await ctx.db.patch(userId, patch);
  },
});

// ─── Login Rate Limiting ──────────────────────────────────────────────────────

/**
 * Cek apakah email sedang dalam lockout.
 * Returns { locked: true, lockedUntil } atau { locked: false }.
 */
export const checkLoginAttempts = internalQuery({
  args: { email: v.string() },
  handler: async (ctx: QueryCtx, args) => {
    const record = await ctx.db
      .query("auth_login_attempts")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (!record) return { locked: false, failedCount: 0 };

    const now = Date.now();
    if (record.lockedUntil && record.lockedUntil > now) {
      return {
        locked: true,
        lockedUntil: record.lockedUntil,
        failedCount: record.failedCount,
      };
    }

    return { locked: false, failedCount: record.failedCount };
  },
});

/**
 * Catat login gagal. Jika sudah >= MAX_FAILED_ATTEMPTS, set lockout.
 */
export const recordFailedLogin = internalMutation({
  args: {
    email: v.string(),
    maxAttempts: v.number(),
    lockoutDurationMs: v.number(),
  },
  handler: async (ctx: MutationCtx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("auth_login_attempts")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (!existing) {
      await ctx.db.insert("auth_login_attempts", {
        email: args.email,
        failedCount: 1,
        lastFailedAt: now,
      });
      return { failedCount: 1, locked: false };
    }

    const newCount = existing.failedCount + 1;
    const locked = newCount >= args.maxAttempts;

    await ctx.db.patch(existing._id, {
      failedCount: newCount,
      lastFailedAt: now,
      lockedUntil: locked ? now + args.lockoutDurationMs : undefined,
    });

    return { failedCount: newCount, locked };
  },
});

/**
 * Reset login attempts setelah login berhasil.
 */
export const clearLoginAttempts = internalMutation({
  args: { email: v.string() },
  handler: async (ctx: MutationCtx, args) => {
    const existing = await ctx.db
      .query("auth_login_attempts")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
