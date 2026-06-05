"use node";
/**
 * ─── Token Refresh API ────────────────────────────────────────────────────────
 * POST /api/auth/refresh
 *
 * Body: { refreshToken }
 * Response: { accessToken, refreshToken (baru), expiresAt }
 *
 * Implementasi refresh token rotation:
 * - Setiap refresh menghasilkan refresh token BARU
 * - Token lama langsung di-revoke
 * - Jika token lama dipakai lagi (reuse detection), semua session di-revoke
 */

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

export const refresh = action({
  args: { refreshToken: v.string() },
  handler: async (ctx, args): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  }> => {
    // ── 1. Hash token untuk lookup ────────────────────────────────────────────
    const tokenHash = await ctx.runAction(internal.auth.jwt.hashToken, {
      token: args.refreshToken,
    });

    // ── 2. Cari refresh token di DB ───────────────────────────────────────────
    const rt = await ctx.runQuery(internal.auth.helpers.getRefreshToken, {
      tokenHash,
    });

    if (!rt) throw new Error("Refresh token tidak valid");

    // ── 3. Deteksi reuse (token sudah di-revoke sebelumnya) ───────────────────
    if (rt.revokedAt) {
      // Possible token theft — revoke semua session user ini
      await ctx.runMutation(
        internal.auth.helpers.revokeAllUserSessions,
        { userId: rt.userId }
      );
      await ctx.runMutation(
        internal.auth.helpers.revokeAllUserRefreshTokens,
        { userId: rt.userId }
      );
      throw new Error(
        "Refresh token sudah tidak valid. Semua session telah di-revoke. Silakan login ulang."
      );
    }

    // ── 4. Cek expiry ─────────────────────────────────────────────────────────
    if (rt.expiresAt < Date.now()) {
      throw new Error("Refresh token sudah expired. Silakan login ulang.");
    }

    // ── 5. Cek session masih valid ────────────────────────────────────────────
    const session = await ctx.runQuery(
      internal.auth.helpers.getSessionById,
      { sessionId: rt.sessionId }
    );
    if (session && session.revokedAt) {
      throw new Error("Session sudah di-revoke. Silakan login ulang.");
    }

    // ── 6. Ambil user ─────────────────────────────────────────────────────────
    const user = await ctx.runQuery(internal.auth.helpers.getUserById, {
      userId: rt.userId,
    });
    if (!user) throw new Error("User tidak ditemukan");
    if (user.status !== "active") throw new Error("Akun tidak aktif");

    // ── 7. Sign token baru ────────────────────────────────────────────────────
    const newTokens = await ctx.runAction(internal.auth.jwt.signTokens, {
      userId: user._id,
      email: user.email,
      role: user.role,
      clubId: user.clubId,
    });

    // ── 8. Revoke token lama (rotation) ──────────────────────────────────────
    const newTokenHash = await ctx.runAction(internal.auth.jwt.hashToken, {
      token: newTokens.refreshToken,
    });
    await ctx.runMutation(internal.auth.helpers.revokeRefreshToken, {
      tokenId: rt._id,
      replacedByHash: newTokenHash,
    });

    // ── 9. Buat session baru ──────────────────────────────────────────────────
    const newSessionId = await ctx.runMutation(
      internal.auth.helpers.createSession,
      {
        userId: user._id,
        jti: newTokens.jti,
      }
    );

    // ── 10. Simpan refresh token baru ─────────────────────────────────────────
    await ctx.runMutation(internal.auth.helpers.createRefreshToken, {
      userId: user._id,
      sessionId: newSessionId,
      tokenHash: newTokenHash,
    });

    return {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      expiresAt: newTokens.expiresAt,
    };
  },
});
