import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const upsertDevUser = internalMutation({
  args: { email: v.string(), passwordHash: v.string() },
  handler: async (ctx, { email, passwordHash }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { passwordHash });
      return { message: `Password untuk ${email} berhasil diupdate.` };
    }

    await ctx.db.insert("users", {
      email,
      passwordHash,
      name: "Pondok Cabe Admin",
      role: "super_admin",
      status: "active",
      lastActiveAt: Date.now(),
    });

    return { message: `User ${email} berhasil dibuat dengan role super_admin.` };
  },
});
