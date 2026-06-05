"use node";
/**
 * ─── Logout API ───────────────────────────────────────────────────────────────
 * POST /api/auth/logout        → logout session saat ini
 * POST /api/auth/logout-all    → logout semua session (semua device)
 */

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

/** Logout session saat ini berdasarkan access token */
export const logout = action({
  args: {
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    // Decode token — tidak perlu valid, kita revoke berdasarkan jti
    let jti: string | undefined;
    try {
      const payload = await ctx.runAction(
        internal.auth.jwt.verifyAccessToken,
        { token: args.accessToken }
      );
      jti = payload.jti;
    } catch {
      // Token expired/invalid — tetap lanjut revoke refresh token jika ada
    }

    // Revoke session berdasarkan jti
    if (jti) {
      const session = await ctx.runQuery(
        internal.auth.helpers.getSessionByJti,
        { jti }
      );
      if (session && !session.revokedAt) {
        await ctx.runMutation(internal.auth.helpers.revokeSession, {
          sessionId: session._id,
        });
      }
    }

    // Revoke refresh token jika dikirim
    if (args.refreshToken) {
      const tokenHash = await ctx.runAction(internal.auth.jwt.hashToken, {
        token: args.refreshToken,
      });
      const rt = await ctx.runQuery(internal.auth.helpers.getRefreshToken, {
        tokenHash,
      });
      if (rt && !rt.revokedAt) {
        await ctx.runMutation(internal.auth.helpers.revokeRefreshToken, {
          tokenId: rt._id,
        });
      }
    }

    return { success: true };
  },
});

/** Logout semua session — semua device */
export const logoutAll = action({
  args: { accessToken: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    // Verify token untuk dapat userId
    const payload = await ctx.runAction(
      internal.auth.jwt.verifyAccessToken,
      { token: args.accessToken }
    );

    // JWT sub adalah string — cast ke Id<"users"> untuk DB operations
    const userId = payload.sub as Id<"users">;

    await ctx.runMutation(internal.auth.helpers.revokeAllUserSessions, {
      userId,
    });
    await ctx.runMutation(internal.auth.helpers.revokeAllUserRefreshTokens, {
      userId,
    });

    return { success: true };
  },
});
