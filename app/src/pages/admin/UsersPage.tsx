/**
 * Admin Users Page — Manage all users: view, search, change role/status.
 * Module: Authentication System + Admin Dashboard
 */

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import {
  Search, Shield, ChevronDown, Users,
  Crown, Settings2, User
} from "lucide-react";
import { api } from "@/modules/convex/api";
import type { Id } from "@/modules/convex/dataModel";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { cn } from "@/utils";

type UserRole = "super_admin" | "club_admin" | "tournament_admin" | "player";
type UserStatus = "active" | "inactive" | "suspended";

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; icon: React.ElementType }> = {
  super_admin:       { label: "Super Admin",        color: "bg-red-100 text-red-700 border-red-200",       icon: Crown },
  club_admin:        { label: "Club Admin",          color: "bg-purple-100 text-purple-700 border-purple-200", icon: Shield },
  tournament_admin:  { label: "Tournament Admin",    color: "bg-blue-100 text-blue-700 border-blue-200",    icon: Settings2 },
  player:            { label: "Player",              color: "bg-green-100 text-green-700 border-green-200", icon: User },
};

const STATUS_CONFIG: Record<UserStatus, { label: string; variant: "default" | "secondary" | "destructive" | "amber" }> = {
  active:    { label: "Aktif",     variant: "default" },
  inactive:  { label: "Nonaktif", variant: "secondary" },
  suspended: { label: "Suspended", variant: "destructive" },
};

function formatDate(ts: number) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(ts));
}

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role as UserRole];
  if (!cfg) return <span className="text-xs text-zinc-500">{role}</span>;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold", cfg.color)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function UserRow({
  user,
  onRoleChange,
  onStatusChange,
  isUpdating,
}: {
  user: {
    _id: Id<"users">;
    name: string;
    email: string;
    displayName?: string;
    role: string;
    status: string;
    handicapIndex?: number;
    membershipNumber?: string;
    lastActiveAt?: number;
    _creationTime: number;
  };
  onRoleChange: (id: Id<"users">, role: UserRole) => void;
  onStatusChange: (id: Id<"users">, status: UserStatus) => void;
  isUpdating: boolean;
}) {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const statusCfg = STATUS_CONFIG[user.status as UserStatus];
  const initials = user.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <tr className="border-b border-emerald-700/40 hover:bg-emerald-800/40 transition-colors">
      {/* Avatar + Name */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 shrink-0 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white text-sm truncate">{user.displayName ?? user.name}</p>
            <p className="text-xs text-emerald-200 truncate">{user.email}</p>
          </div>
        </div>
      </td>

      {/* Role */}
      <td className="px-4 py-3">
        <div className="relative">
          <button
            onClick={() => { setShowRoleMenu((v) => !v); setShowStatusMenu(false); }}
            className="flex items-center gap-1 hover:opacity-80 transition-opacity"
            disabled={isUpdating}
          >
            <RoleBadge role={user.role} />
            <ChevronDown className="h-3 w-3 text-zinc-400" />
          </button>
          {showRoleMenu && (
            <div className="absolute left-0 top-full z-20 mt-1 w-44 rounded-lg border border-zinc-200 bg-white shadow-lg">
              {(Object.keys(ROLE_CONFIG) as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => { onRoleChange(user._id, r); setShowRoleMenu(false); }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50 transition-colors",
                    user.role === r && "bg-green-50 font-semibold"
                  )}
                >
                  <RoleBadge role={r} />
                </button>
              ))}
            </div>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <div className="relative">
          <button
            onClick={() => { setShowStatusMenu((v) => !v); setShowRoleMenu(false); }}
            className="flex items-center gap-1 hover:opacity-80 transition-opacity"
            disabled={isUpdating}
          >
            <Badge variant={statusCfg?.variant ?? "secondary"} className="text-xs">
              {statusCfg?.label ?? user.status}
            </Badge>
            <ChevronDown className="h-3 w-3 text-zinc-400" />
          </button>
          {showStatusMenu && (
            <div className="absolute left-0 top-full z-20 mt-1 w-36 rounded-lg border border-zinc-200 bg-white shadow-lg">
              {(["active", "inactive", "suspended"] as UserStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => { onStatusChange(user._id, s); setShowStatusMenu(false); }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50 transition-colors",
                    user.status === s && "bg-green-50 font-semibold"
                  )}
                >
                  <Badge variant={STATUS_CONFIG[s].variant} className="text-xs">{STATUS_CONFIG[s].label}</Badge>
                </button>
              ))}
            </div>
          )}
        </div>
      </td>

      {/* Handicap */}
      <td className="px-4 py-3 text-sm text-white font-medium tabular-nums">
        {user.handicapIndex !== undefined ? user.handicapIndex : <span className="text-emerald-400">—</span>}
      </td>

      {/* Membership */}
      <td className="px-4 py-3 text-sm text-white font-medium">
        {user.membershipNumber ?? <span className="text-emerald-400">—</span>}
      </td>

      {/* Last Active */}
      <td className="px-4 py-3 text-sm text-emerald-100 font-medium">
        {user.lastActiveAt ? formatDate(user.lastActiveAt) : formatDate(user._creationTime)}
      </td>
    </tr>
  );
}

export function UsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const result = useQuery(api.queries.dashboard.userList, {
    paginationOpts: { numItems: 200, cursor: null },
  });

  const adminUpdateUser = useMutation(api.mutations.users.adminUpdateUser);

  const users = useMemo(() => {
    const page = result?.page ?? [];
    return page.filter((u) => {
      const matchSearch = !search.trim() ||
        [u.name, u.displayName, u.email, u.membershipNumber].join(" ").toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      const matchStatus = statusFilter === "all" || u.status === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [result, search, roleFilter, statusFilter]);

  async function handleRoleChange(id: Id<"users">, role: UserRole) {
    setUpdatingId(id);
    try {
      await adminUpdateUser({ id, role });
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleStatusChange(id: Id<"users">, status: UserStatus) {
    setUpdatingId(id);
    try {
      await adminUpdateUser({ id, status });
    } finally {
      setUpdatingId(null);
    }
  }

  if (result === undefined) return <PageSpinner />;

  const total = result.page.length;
  const activeCount = result.page.filter((u) => u.status === "active").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Pengguna"
        description="Kelola akun, role, dan status semua pengguna sistem"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total User", value: total, color: "text-white bg-emerald-700" },
          { label: "Aktif", value: activeCount, color: "text-white bg-emerald-600" },
          { label: "Admin", value: result.page.filter((u) => u.role !== "player").length, color: "text-white bg-emerald-700" },
          { label: "Player", value: result.page.filter((u) => u.role === "player").length, color: "text-white bg-emerald-700" },
        ].map(({ label, value, color }) => (
          <div key={label} className={cn("rounded-lg border border-emerald-600/50 p-4", color)}>
            <p className="text-2xl font-bold tabular-nums text-white">{value}</p>
            <p className="text-xs font-semibold text-emerald-100 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-700" />
              Daftar Pengguna
              <span className="text-sm font-normal text-emerald-200">({users.length} ditampilkan)</span>
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              {/* Role filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as UserRole | "all")}
                className="h-9 rounded-md border border-emerald-600 bg-emerald-800 px-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="all">Semua Role</option>
                {(Object.keys(ROLE_CONFIG) as UserRole[]).map((r) => (
                  <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
                ))}
              </select>
              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as UserStatus | "all")}
                className="h-9 rounded-md border border-emerald-600 bg-emerald-800 px-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="all">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
          {/* Search */}
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              placeholder="Cari nama, email, atau nomor membership..."
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-emerald-700/50 bg-emerald-900/50 text-left text-xs font-bold uppercase tracking-wide text-emerald-200">
                  <th className="px-4 py-3">Pengguna</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">HCP</th>
                  <th className="px-4 py-3">Membership</th>
                  <th className="px-4 py-3">Terakhir Aktif</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-emerald-200">
                      <Users className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
                      <p className="font-semibold text-white">Tidak ada pengguna ditemukan</p>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <UserRow
                      key={user._id}
                      user={user as Parameters<typeof UserRow>[0]["user"]}
                      onRoleChange={handleRoleChange}
                      onStatusChange={handleStatusChange}
                      isUpdating={updatingId === user._id}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
