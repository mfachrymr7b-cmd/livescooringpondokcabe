"use node";
/**
 * ─── Change Password ──────────────────────────────────────────────────────────
 */

import { action } from "../_generated/server";
import { v } from "convex/values";
import bcrypt from "bcryptjs";
import { internal } from "../_generated/api";
import { validatePasswordStrength } from "./password";
import { BCRYPT_ROUNDS } from "./constants";
import type { UserContext } from "./validate";

export const changePassword = action({
  args: {
    accessToken: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
    // 1. Validasi token
    const userCtx: UserContext = await ctx.runAction(
      internal.auth.validate.validateToken,
      { accessToken: args.accessToken }
    );

    // 2. Ambil user dengan passwordHash
    const user = await ctx.runQuery(internal.auth.helpers.getUserById, {
      userId: userCtx.userId,
    });
    if (!user) throw new Error("User tidak ditemukan");

    // 3. Verifikasi password lama
    const isValid = await bcrypt.compare(args.currentPassword, user.passwordHash);
    if (!isValid) throw new Error("Password lama tidak benar");

    // 4. Validasi password baru
    if (args.newPassword === args.currentPassword) {
      throw new Error("Password baru tidak boleh sama dengan password lama");
    }
    const pwCheck = validatePasswordStrength(args.newPassword);
    if (!pwCheck.valid) throw new Error(pwCheck.reason);

    // 5. Hash & simpan
    const newHash = await bcrypt.hash(args.newPassword, BCRYPT_ROUNDS);
    await ctx.runMutation(internal.auth.helpers.updatePassword, {
      userId: userCtx.userId,
      passwordHash: newHash,
    });

    // 6. Revoke semua refresh tokens
    await ctx.runMutation(internal.auth.helpers.revokeAllUserRefreshTokens, {
      userId: userCtx.userId,
    });

    return { success: true, message: "Password berhasil diubah" };
  },
});
