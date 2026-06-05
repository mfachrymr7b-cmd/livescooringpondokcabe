"use node";
/**
 * Migration: Seed dev admin user
 * Date: 2026-05-18
 * Reason: Buat/reset user pondokcabe001@golfscoreid.com dengan password "001"
 *
 * Jalankan: npx convex run migrations/20260518_reset_dev_password:seedDevUser
 */

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import bcrypt from "bcryptjs";

export const seedDevUser = internalAction({
  args: {},
  handler: async (ctx): Promise<{ message: string }> => {
    const email = "pondokcabe001@golfscoreid.com";
    const password = "001";

    // Hash password langsung tanpa validasi (dev only)
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await ctx.runMutation(
      internal.migrations["20260518_reset_dev_password_mutations"].upsertDevUser,
      { email, passwordHash }
    );

    return { message: result.message };
  },
});
