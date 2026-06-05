# Live scoring Pondokcabe — Realtime Backend (Convex)

Repository ini berisi:

- `app/` — frontend React + Vite untuk Live scoring golf.
- `convex/` — backend realtime dan auth menggunakan Convex.

## Menjalankan lokal

1. Jalankan `npm install` di root.
2. Salin `CONVEX_URL` dari `./.env.local` ke `app/.env` sebagai `VITE_CONVEX_URL`.
3. Jalankan `npm run dev` untuk menjalankan `convex dev` dan frontend `app` secara bersamaan.

## Struktur Project

```
convex/
  schema.ts                  # Definisi tabel database
  queries/
    players.ts               # Query player (live)
    matches.ts               # Query match (live)
    scores.ts                # Query skor (live)
    leaderboard.ts           # Leaderboard realtime (live)
  mutations/
    players.ts               # CRUD player
    matches.ts               # Buat/mulai/selesaikan match
    scores.ts                # Catat skor + update leaderboard otomatis
  subscriptions/
    onMessages.ts            # Panduan subscription
  _generated/                # Auto-generated oleh Convex CLI (jangan diedit)
src/
  convexClient.ts            # Client singleton untuk non-React
.env.local                   # CONVEX_URL (diisi otomatis oleh convex dev)
convex.json                  # Config deployment Convex
```

## Schema Database

| Tabel         | Deskripsi                                      |
|---------------|------------------------------------------------|
| `players`     | Data pemain                                    |
| `matches`     | Data pertandingan (pending/ongoing/finished)   |
| `scores`      | Catatan skor per ronde per pemain              |
| `leaderboard` | Peringkat live per match (denormalized)        |

## Setup & Jalankan

### 1. Login ke Convex

```bash
npx convex login
```

### 2. Jalankan dev server (WAJIB dijalankan pertama kali)

```bash
npm run convex:dev
```

Ini akan:
- Buat deployment gratis di Convex Cloud
- Tulis `CONVEX_URL` ke `.env.local` secara otomatis
- Generate folder `convex/_generated/`
- Watch perubahan file dan push otomatis

### 3. Deploy ke production

```bash
npm run convex:deploy
```

## Production hardening

### Permission testing
- `convex/auth/roles.ts` defines RBAC helper functions like `hasMinRole`, `canManageUsers`, and `canManageTournament`.
- Verify each protected action with both valid and invalid roles.
- Test all admin routes (`/api/admin/*`) with `club_admin`, `super_admin`, and `player` roles to confirm forbidden responses.

### API protection
- HTTP auth routes now enforce rate limits on public and sensitive endpoints.
- `/api/auth/login`, `/api/auth/register`, `/api/auth/refresh`, and admin routes are throttled by IP/token.
- Auth-required routes require valid Bearer tokens and use `requireRole` to enforce minimum role levels.

### Rate limiting
- Login attempts are already protected with brute-force lockout via `convex/auth/login.ts`.
- Added generic request throttling for auth and admin HTTP endpoints using `api_rate_limits`.

### Backup strategy
- Use Convex CLI export to snapshot production data:

```bash
npx convex export --output convex-backup.zip
```

- Keep backups offsite and store them with date metadata.
- For restore, use `npx convex import convex-backup.zip`.

### Error logging
- Added `api_logs` table to capture HTTP-level warnings and errors.
- HTTP route failures are logged centrally with route, message, and timestamp.
- Use the Convex dashboard or `npx convex data api_logs` to inspect runtime errors.

## Contoh Penggunaan (React)

```tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function Leaderboard({ matchId }) {
  // Otomatis update realtime tanpa polling
  const board = useQuery(api.queries.leaderboard.byMatch, { matchId });
  const record = useMutation(api.mutations.scores.record);

  return (
    <ul>
      {board?.map((entry) => (
        <li key={entry._id}>
          #{entry.rank} {entry.player?.name} — {entry.totalScore} pts
        </li>
      ))}
    </ul>
  );
}
```

## Alur Scoring

```
1. Buat match       → mutations/matches.create
2. Daftarkan player → mutations/players.create
3. Mulai match      → mutations/matches.start
4. Catat skor       → mutations/scores.record  ← otomatis update leaderboard
5. Selesaikan match → mutations/matches.finish
```
