/**
 * UserProfileMenu — avatar + dropdown dengan info user, navigasi profil, logout.
 */
import { useNavigate } from "react-router-dom";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { User, LogOut, ChevronDown, Shield } from "lucide-react";
import { cn } from "@/utils";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/services/auth";
import { UserAvatar } from "./Sidebar";

const roleLabel: Record<string, string> = {
  super_admin: "Super Admin",
  club_admin: "Club Admin",
  tournament_admin: "Tournament Admin",
  player: "Player",
};

const roleBadgeClass: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700",
  club_admin: "bg-blue-100 text-blue-700",
  tournament_admin: "bg-amber-100 text-amber-700",
  player: "bg-green-100 text-green-700",
};

export function UserProfileMenu() {
  const { user, setUnauthenticated } = useAuthStore();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      const refreshToken = authService.getRefreshToken() ?? undefined;
      await authService.logout(refreshToken);
    } finally {
      setUnauthenticated();
      navigate("/login", { replace: true });
    }
  }

  if (!user) return null;

  const role = user.role ?? "player";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="Menu profil"
          className={cn(
            "flex items-center gap-2 rounded-lg px-2 py-1.5",
            "text-[#A7F3D0] hover:bg-emerald-700/50 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          )}
        >
          <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
          <span className="hidden max-w-[120px] truncate text-sm font-medium text-[#ECFDF5] md:block">
            {user.name}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-[#6EE7B7]" aria-hidden />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className={cn(
            "z-50 w-56 rounded-xl border border-emerald-700/50 bg-[#065F46] shadow-lg",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          )}
        >
          {/* User info */}
          <div className="border-b border-emerald-700/50 px-4 py-3">
            <div className="flex items-center gap-3">
              <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#ECFDF5]">{user.name}</p>
                <p className="truncate text-xs text-[#A7F3D0]">{user.email}</p>
              </div>
            </div>
            <div className="mt-2.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  roleBadgeClass[role] ?? "bg-emerald-700/50 text-[#A7F3D0]"
                )}
              >
                <Shield className="h-2.5 w-2.5" />
                {roleLabel[role] ?? role}
              </span>
            </div>
          </div>

          {/* Menu items */}
          <div className="p-1">
            <DropdownMenu.Item
              onSelect={() => navigate("/profile")}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[#A7F3D0]",
                "outline-none hover:bg-emerald-700/40 focus:bg-emerald-700/40 transition-colors"
              )}
            >
              <User className="h-4 w-4 text-[#6EE7B7]" />
              Profil Saya
            </DropdownMenu.Item>
          </div>

          <DropdownMenu.Separator className="mx-2 h-px bg-emerald-700/50" />

          <div className="p-1">
            <DropdownMenu.Item
              onSelect={handleLogout}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-400",
                "outline-none hover:bg-red-900/30 focus:bg-red-900/30 transition-colors"
              )}
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </DropdownMenu.Item>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
