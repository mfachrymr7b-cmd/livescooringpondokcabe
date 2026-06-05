# Migrations

Convex tidak punya sistem migrasi tradisional seperti SQL.
Schema changes di-handle dengan cara berikut:

## Cara Kerja Schema Changes di Convex

### 1. Additive Changes (aman, langsung push)
- Tambah field baru (optional)
- Tambah tabel baru
- Tambah index baru

Cukup update `schema.ts` dan jalankan `npx convex dev` atau `npx convex deploy`.

### 2. Breaking Changes (butuh migrasi data)
- Rename field
- Ubah tipe field
- Hapus field yang masih dipakai
- Ubah index yang sudah ada

Untuk ini, gunakan migration script di folder ini.

## Struktur Migration Script

Setiap migration adalah Convex mutation/action di file terpisah.
Penamaan: `YYYYMMDD_deskripsi.ts`

Contoh: `20260512_add_handicap_to_players.ts`

## Cara Menjalankan Migration

```bash
# Jalankan migration via CLI
npx convex run migrations/20260512_add_handicap_to_players:migrate
```

## Template Migration

```typescript
// convex/migrations/20260512_example.ts
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Migration: Deskripsi singkat apa yang dilakukan
 * Date: 2026-05-12
 * Reason: Kenapa migration ini diperlukan
 */
export const migrate = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Proses dalam batch untuk menghindari transaction limit
    const batch = await ctx.db
      .query("table_name")
      .paginate({ numItems: 100, cursor: args.cursor ?? null });

    for (const doc of batch.page) {
      await ctx.db.patch(doc._id, {
        newField: "defaultValue",
      });
    }

    // Jadwalkan batch berikutnya jika masih ada
    if (!batch.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations["20260512_example"].migrate,
        { cursor: batch.continueCursor }
      );
    }

    return {
      processed: batch.page.length,
      isDone: batch.isDone,
    };
  },
});
```

## Log Migrations

Catat setiap migration yang sudah dijalankan di bawah ini:

| Tanggal    | File                              | Deskripsi                                          | Status      |
|------------|-----------------------------------|----------------------------------------------------|-------------|
| 2026-05-12 | 20260512_initial_seed             | Schema awal + seed data dev (course + 18 holes)    | ✅ Done     |
| 2026-05-16 | 20260516_schema_v1                | Schema v1 checkpoint: audit + backfill + cleanup   | ⏳ Pending  |

## Cara Menjalankan Migration v1

```bash
# Audit & backfill data
npx convex run migrations/20260516_schema_v1:auditUsers
npx convex run migrations/20260516_schema_v1:auditCourses
npx convex run migrations/20260516_schema_v1:auditTournaments
npx convex run migrations/20260516_schema_v1:backfillPlayerScores

# Rebuild leaderboard untuk turnamen tertentu
npx convex run migrations/20260516_schema_v1:backfillLeaderboard -- --tournamentId <id>

# Cleanup expired sessions (jalankan berkala)
npx convex run migrations/20260516_schema_v1:cleanupExpiredSessions
npx convex run migrations/20260516_schema_v1:cleanupExpiredRefreshTokens
```
