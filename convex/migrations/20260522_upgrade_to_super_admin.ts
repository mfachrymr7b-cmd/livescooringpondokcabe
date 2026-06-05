/**
 * Migration: Upgrade user to super_admin
 * Date: 2026-05-22
 * Reason: Convert player account to super_admin
 *
 * Jalankan: npx convex run migrations/20260522_upgrade_to_super_admin:upgradeUserToSuperAdmin
 * Atau:     npx convex run migrations/20260522_upgrade_to_super_admin:upgradeUserToSuperAdmin pondokcabe001@golfscoreid.com
 */

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

export const upgradeUserToSuperAdmin = internalAction({
  args: { email: v.optional(v.string()) },
  handler: async (ctx, args): Promise<{ message: string; email?: string }> => {
    let targetEmail = args.email;

    // Jika tidak ada email yang dikirim, coba gunakan email dev default
    if (!targetEmail) {
      targetEmail = "pondokcabe001@golfscoreid.com";
    }

    const user = await ctx.runQuery(internal.auth.helpers.getUserByEmail, {
      email: targetEmail,
    });

    if (!user) {
      return { 
        message: `Error: User dengan email ${targetEmail} tidak ditemukan`,
        email: targetEmail 
      };
    }

    const previousRole = user.role;
    
    // Update role menggunakan internal helper
    await ctx.runMutation(internal.auth.helpers.adminPatchUser, {
      userId: user._id,
      role: "super_admin",
    });

    // Revoke semua session agar role baru berlaku segera
    await ctx.runMutation(internal.auth.helpers.revokeAllUserSessions, {
      userId: user._id,
    });

    return {
      message: `✅ User ${user.email} berhasil diupgrade dari "${previousRole}" menjadi "super_admin"`,
      email: user.email,
    };
  },
});
