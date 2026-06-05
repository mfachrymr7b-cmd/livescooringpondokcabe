"use node";
/**
 * ─── Session & Token Validation ───────────────────────────────────────────────
 */

import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { hasMinRole, canManageTournament } from "./roles";
import type { UserRole } from "../types";
import type { Id } from "../_generated/dataModel";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserContext = {
  userId: Id<"users">;
  email: string;
  name: string;
  role: UserRole;
  clubId?: string;
  sessionId: Id<"auth_sessions">;
};

// ─── validateToken (internal) ─────────────────────────────────────────────────

export const validateToken = internalAction({
  args: { accessToken: v.string() },
  handler: async (ctx, args): Promise<UserContext> => {
    // 1. Verify JWT
    let payload: Awaited<ReturnType<typeof ctx.runAction<typeof internal.auth.jwt.verifyAccessToken>>>;
    try {
      payload = await ctx.runAction(internal.auth.jwt.verifyAccessToken, {
        token: args.accessToken,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Token tidak valid";
      throw new Error(`Unauthorized: ${msg}`);
    }

    // 2. Cek session
    const session = await ctx.runQuery(internal.auth.helpers.getSessionByJti, {
      jti: payload.jti!,
    });
    if (!session) throw new Error("Unauthorized: Session tidak ditemukan");
    if (session.revokedAt) throw new Error("Unauthorized: Session sudah di-revoke");
    if (session.expiresAt < Date.now()) throw new Error("Unauthorized: Session expired");

    // 3. Ambil user
    const user = await ctx.runQuery(internal.auth.helpers.getUserById, {
      userId: session.userId,
    });
    if (!user) throw new Error("Unauthorized: User tidak ditemukan");
    if (user.status !== "active") throw new Error("Unauthorized: Akun tidak aktif");

    // 4. Touch session
    await ctx.runMutation(internal.auth.helpers.touchSession, {
      sessionId: session._id,
    });

    return {
      userId: user._id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      clubId: user.clubId,
      sessionId: session._id,
    };
  },
});

// ─── requireRole (public) ─────────────────────────────────────────────────────

export const requireRole = action({
  args: {
    accessToken: v.string(),
    minRole: v.union(
      v.literal("super_admin"),
      v.literal("club_admin"),
      v.literal("tournament_admin"),
      v.literal("player")
    ),
  },
  handler: async (ctx, args): Promise<UserContext> => {
    const userCtx: UserContext = await ctx.runAction(
      internal.auth.validate.validateToken,
      { accessToken: args.accessToken }
    );

    if (!hasMinRole(userCtx.role, args.minRole as UserRole)) {
      throw new Error(
        `Forbidden: Butuh role minimal "${args.minRole}", kamu punya "${userCtx.role}"`
      );
    }

    return userCtx;
  },
});

// ─── requireTournamentAccess (public) ────────────────────────────────────────

export const requireTournamentAccess = action({
  args: {
    accessToken: v.string(),
    tournamentId: v.id("tournaments"),
  },
  handler: async (ctx, args): Promise<UserContext> => {
    const userCtx: UserContext = await ctx.runAction(
      internal.auth.validate.validateToken,
      { accessToken: args.accessToken }
    );

    if (!canManageTournament(userCtx.role)) {
      throw new Error("Forbidden: Tidak punya akses ke tournament ini");
    }

    return userCtx;
  },
});
