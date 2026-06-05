/**
 * NotificationDropdown — bell icon dengan dropdown notifikasi.
 * Data notifikasi diambil dari Convex tabel notifications.
 */
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bell, Trophy, Flag, Info, CheckCheck, FileText } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/modules/convex/api";
import type { Id } from "@/modules/convex/dataModel";
import { cn } from "@/utils";
import { formatDateTime } from "@/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type NotifType = "tournament" | "scorecard" | "match" | "system";

const typeIcon: Record<NotifType, React.ReactNode> = {
  tournament: <Trophy className="h-4 w-4 text-amber-500" />,
  scorecard: <FileText className="h-4 w-4 text-green-600" />,
  match: <Flag className="h-4 w-4 text-blue-500" />,
  system: <Info className="h-4 w-4 text-zinc-500" />,
};

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationDropdown() {
  const notifications = useQuery(api.queries.notifications.myNotifications, { limit: 20 });
  const markReadMutation = useMutation(api.mutations.notifications.markRead);
  const markAllReadMutation = useMutation(api.mutations.notifications.markAllRead);

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  async function handleMarkAllRead() {
    await markAllReadMutation();
  }

  async function handleMarkRead(id: Id<"notifications">) {
    await markReadMutation({ id });
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label={`Notifikasi${unreadCount > 0 ? `, ${unreadCount} belum dibaca` : ""}`}
          className={cn(
            "relative flex h-9 w-9 items-center justify-center rounded-md",
            "text-[#A7F3D0] hover:bg-emerald-700/50 hover:text-[#ECFDF5]",
            "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          )}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span
              aria-hidden
              className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className={cn(
            "z-50 w-80 rounded-xl border border-emerald-700/50 bg-[#065F46] shadow-lg",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-emerald-700/50 px-4 py-3">
            <span className="text-sm font-semibold text-[#ECFDF5]">Notifikasi</span>
            {unreadCount > 0 && (
              <button
                onClick={() => void handleMarkAllRead()}
                className="flex items-center gap-1 text-xs text-[#A7F3D0] hover:text-[#ECFDF5] hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Tandai semua dibaca
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications === undefined ? (
              /* Loading skeleton */
              <div className="space-y-2 p-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-emerald-700/40" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#6EE7B7]">Tidak ada notifikasi</p>
            ) : (
              notifications.map((notif) => (
                <DropdownMenu.Item
                  key={notif.id}
                  onSelect={() => void handleMarkRead(notif.id as Id<"notifications">)}
                  className={cn(
                    "flex cursor-pointer gap-3 px-4 py-3 outline-none transition-colors",
                    "hover:bg-emerald-700/40 focus:bg-emerald-700/40",
                    !notif.read && "bg-emerald-700/20"
                  )}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {typeIcon[notif.type as NotifType] ?? typeIcon.system}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          "text-sm leading-snug",
                          notif.read ? "font-normal text-[#A7F3D0]" : "font-semibold text-[#ECFDF5]"
                        )}
                      >
                        {notif.title}
                      </p>
                      {!notif.read && (
                        <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-amber-400" aria-hidden />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-[#6EE7B7] line-clamp-2">{notif.body}</p>
                    <p className="mt-1 text-[10px] text-[#6EE7B7]/70">
                      {formatDateTime(notif.timestamp)}
                    </p>
                  </div>
                </DropdownMenu.Item>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-emerald-700/50 px-4 py-2.5">
            <p className="w-full text-center text-xs text-[#6EE7B7]">
              {notifications !== undefined
                ? `${notifications.length} notifikasi`
                : "Memuat..."}
            </p>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
