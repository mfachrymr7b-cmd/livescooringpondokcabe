/**
 * ProfilePage — User profile with live data + edit form.
 * Wired to queries.users.me and mutations.users.updateProfile.
 */

import { useState, FormEvent } from "react";
import { useQuery, useMutation } from "convex/react";
import { User, Edit2, Save, X, Shield, Clock, Trophy, Flag, MapPin } from "lucide-react";
import { api } from "@/modules/convex/api";
import type { Id } from "@/modules/convex/dataModel";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { cn } from "@/utils";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  club_admin: "Club Admin",
  tournament_admin: "Tournament Admin",
  player: "Player",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-100 text-red-700",
  club_admin: "bg-purple-100 text-purple-700",
  tournament_admin: "bg-blue-100 text-blue-700",
  player: "bg-green-100 text-green-700",
};

const HANDICAP_CATEGORY_LABELS: Record<string, string> = {
  scratch: "Scratch (0)",
  category_1: "Elit (< 5.5)",
  category_2: "Lanjut (5.5 - 12.4)",
  category_3: "Menengah (12.5 - 18.4)",
  category_4: "Rekreasi (18.5 - 26.4)",
  category_5: "Amatir (26.5 - 36.0)",
  category_6: "Pemula (37.0 - 54.0)",
};

function formatDate(ts: number) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  }).format(new Date(ts));
}

function UserAvatar({ name, avatarUrl, size = "lg" }: { name: string; avatarUrl?: string; size?: "sm" | "lg" }) {
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const sizeClass = size === "lg" ? "h-16 w-16 text-xl" : "h-10 w-10 text-sm";

  if (avatarUrl) {
    return (
      <img src={avatarUrl} alt={name} className={cn("rounded-full object-cover border-2 border-zinc-200", sizeClass)} />
    );
  }
  return (
    <div className={cn("flex items-center justify-center rounded-full bg-green-100 font-bold text-green-700", sizeClass)}>
      {initials}
    </div>
  );
}

export function ProfilePage() {
  const user = useQuery(api.queries.users.me);
  const sessions = useQuery(api.queries.users.mySessions);
  const updateProfile = useMutation(api.mutations.users.updateProfile);

  // Riwayat turnamen — wired ke Convex via listByUser
  const tournamentHistory = useQuery(
    api.queries.players.listByUser,
    user ? { userId: user._id as Id<"users">, paginationOpts: { numItems: 10, cursor: null } } : "skip"
  );

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    displayName: "",
    phoneNumber: "",
    handicapIndex: "",
    membershipNumber: "",
  });

  function startEdit() {
    if (!user) return;
    setForm({
      displayName: user.displayName ?? user.name ?? "",
      phoneNumber: user.phoneNumber ?? "",
      handicapIndex: user.handicapIndex !== undefined ? String(user.handicapIndex) : "",
      membershipNumber: user.membershipNumber ?? "",
    });
    setEditing(true);
    setError(null);
    setSuccess(false);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        displayName: form.displayName.trim() || undefined,
        phoneNumber: form.phoneNumber.trim() || undefined,
        handicapIndex: form.handicapIndex ? Number(form.handicapIndex) : undefined,
        membershipNumber: form.membershipNumber.trim() || undefined,
      });
      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan profil");
    } finally {
      setSaving(false);
    }
  }

  if (user === undefined) return <PageSpinner />;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <User className="h-12 w-12 text-zinc-300 mb-3" />
        <p className="font-medium text-zinc-600">Tidak dapat memuat profil</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Profil Saya" description="Kelola informasi akun dan preferensi golf kamu" />

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          ✓ Profil berhasil diperbarui
        </div>
      )}

      {/* ── Profile Card ── */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-2">
              <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="lg" />
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", ROLE_COLORS[user.role] ?? "bg-zinc-100 text-zinc-600")}>
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {!editing ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-zinc-900">{user.displayName ?? user.name}</h2>
                      <p className="text-sm text-zinc-500">{user.email}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={startEdit}>
                      <Edit2 className="h-4 w-4" />
                      Edit
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <InfoField label="Nama Lengkap" value={user.name} />
                    <InfoField label="Display Name" value={user.displayName ?? "—"} />
                    <InfoField label="No. Telepon" value={user.phoneNumber ?? "—"} />
                    <InfoField label="No. Membership" value={user.membershipNumber ?? "—"} />
                    <InfoField
                      label="Handicap Index"
                      value={user.handicapIndex !== undefined ? String(user.handicapIndex) : "—"}
                    />
                    <InfoField
                      label="Handicap Category"
                      value={user.handicapCategory ? (HANDICAP_CATEGORY_LABELS[user.handicapCategory] ?? user.handicapCategory) : "—"}
                    />
                  </div>

                  {user.lastActiveAt && (
                    <p className="text-xs text-zinc-400">
                      Terakhir aktif: {formatDate(user.lastActiveAt)}
                    </p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-zinc-900">Edit Profil</h2>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {error && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        value={form.displayName}
                        onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                        placeholder="Nama yang ditampilkan"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phoneNumber">No. Telepon</Label>
                      <Input
                        id="phoneNumber"
                        value={form.phoneNumber}
                        onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                        placeholder="+62 812 3456 7890"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="handicapIndex">Handicap Index</Label>
                      <Input
                        id="handicapIndex"
                        type="number"
                        step="0.1"
                        min="0"
                        max="54"
                        value={form.handicapIndex}
                        onChange={(e) => setForm((f) => ({ ...f, handicapIndex: e.target.value }))}
                        placeholder="12.4"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="membershipNumber">No. Membership</Label>
                      <Input
                        id="membershipNumber"
                        value={form.membershipNumber}
                        onChange={(e) => setForm((f) => ({ ...f, membershipNumber: e.target.value }))}
                        placeholder="MBR-001"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" loading={saving}>
                      <Save className="h-4 w-4" />
                      Simpan
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                      Batal
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Active Sessions ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-700" />
            Sesi Aktif
          </CardTitle>
          <p className="text-sm text-zinc-500">Perangkat yang sedang login ke akun kamu</p>
        </CardHeader>
        <CardContent>
          {sessions === undefined ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded bg-zinc-100" />)}
            </div>
          ) : !sessions || sessions.length === 0 ? (
            <p className="text-sm text-zinc-400">Tidak ada sesi aktif</p>
          ) : (
            <div className="divide-y divide-zinc-100">
              {sessions.map((session) => (
                <div key={session.sessionId} className="flex items-center justify-between py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-zinc-400 shrink-0" />
                    <div>
                      <p className="font-medium text-zinc-900 truncate max-w-xs">
                        {session.userAgent ?? "Browser tidak diketahui"}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {session.ipAddress ?? "IP tidak diketahui"} · Terakhir: {formatDate(session.lastUsedAt)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="default" className="shrink-0">Aktif</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Account Info ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-green-700" />
            Info Akun
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoField label="Email" value={user.email} />
            <InfoField label="Role" value={ROLE_LABELS[user.role] ?? user.role} />
            <InfoField label="Status" value={user.status} />
          </div>
        </CardContent>
      </Card>

      {/* ── Riwayat Turnamen — wired ke Convex ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-green-700" />
            Riwayat Turnamen
          </CardTitle>
          <p className="text-sm text-zinc-500">Turnamen yang pernah diikuti</p>
        </CardHeader>
        <CardContent>
          {tournamentHistory === undefined ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded bg-zinc-100" />
              ))}
            </div>
          ) : !tournamentHistory || tournamentHistory.page.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Flag className="h-8 w-8 text-zinc-300 mb-2" />
              <p className="text-sm text-zinc-500">Belum pernah mengikuti turnamen</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {tournamentHistory.page.map((player) => (
                <TournamentHistoryRow key={player._id} player={player} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 px-3 py-2.5">
      <p className="text-xs font-medium text-zinc-500 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-zinc-900 truncate">{value}</p>
    </div>
  );
}

// ─── Tournament History Row — wired ke Convex ─────────────────────────────────

const STATUS_VARIANT: Record<string, "default" | "secondary" | "blue" | "amber" | "destructive" | "outline"> = {
  confirmed: "default",
  registered: "blue",
  withdrawn: "amber",
  disqualified: "destructive",
  completed: "secondary",
};

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Terkonfirmasi",
  registered: "Terdaftar",
  withdrawn: "Mundur",
  disqualified: "Diskualifikasi",
  completed: "Selesai",
};

function TournamentHistoryRow({ player }: {
  player: {
    _id: Id<"players">;
    tournamentId: Id<"tournaments">;
    displayName: string;
    handicapIndex?: number;
    status: string;
    registeredAt: number;
    totalScore?: number;
    totalNetScore?: number;
  };
}) {
  const tournament = useQuery(
    api.queries.tournaments.get,
    player.tournamentId ? { id: player.tournamentId } : "skip"
  );
  const course = useQuery(
    api.queries.golf_courses.get,
    tournament ? { id: tournament.courseId as Id<"golf_courses"> } : "skip"
  );

  return (
    <div className="flex items-center justify-between py-3 text-sm gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50">
          <Trophy className="h-4 w-4 text-green-700" />
        </div>
        <div className="min-w-0">
          {tournament === undefined ? (
            <div className="h-4 w-40 animate-pulse rounded bg-zinc-200" />
          ) : tournament ? (
            <>
              <p className="font-semibold text-zinc-900 truncate">{tournament.name}</p>
              <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                {course && (
                  <>
                    <MapPin className="h-3 w-3" />
                    {course.name}
                    <span className="mx-1">·</span>
                  </>
                )}
                {formatDate(player.registeredAt)}
              </p>
            </>
          ) : (
            <p className="text-zinc-400 text-xs">Turnamen tidak ditemukan</p>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <Badge variant={STATUS_VARIANT[player.status] ?? "secondary"}>
          {STATUS_LABEL[player.status] ?? player.status}
        </Badge>
        {player.totalScore !== undefined && (
          <span className="text-xs text-zinc-500 tabular-nums">
            Skor: <strong className="text-zinc-800">{player.totalScore}</strong>
          </span>
        )}
        {player.handicapIndex !== undefined && (
          <span className="text-xs text-zinc-400">HCP {player.handicapIndex}</span>
        )}
      </div>
    </div>
  );
}
