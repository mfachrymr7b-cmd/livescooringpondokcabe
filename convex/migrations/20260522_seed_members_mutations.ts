/**
 * Internal mutations untuk seed member — berjalan di Convex V8 runtime (tanpa bcrypt).
 */

import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { handicapCategoryValidator } from "../types";

export const upsertMember = internalMutation({
  args: {
    email: v.string(),
    name: v.string(),
    passwordHash: v.string(),
    handicapIndex: v.number(),
    handicapCategory: handicapCategoryValidator,
    displayName: v.string(),
  },
  handler: async (ctx, args): Promise<{ created: boolean; userId: string }> => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        handicapIndex: args.handicapIndex,
        handicapCategory: args.handicapCategory,
        displayName: args.displayName,
      });
      return { created: false, userId: existing._id };
    }

    const userId = await ctx.db.insert("users", {
      email: args.email,
      passwordHash: args.passwordHash,
      name: args.name,
      displayName: args.displayName,
      role: "player",
      status: "active",
      handicapIndex: args.handicapIndex,
      handicapCategory: args.handicapCategory,
      lastActiveAt: Date.now(),
    });

    return { created: true, userId };
  },
});
