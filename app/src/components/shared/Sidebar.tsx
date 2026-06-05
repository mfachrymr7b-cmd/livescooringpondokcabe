import { NavLink } from "react-router-dom";
import { Flag, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { useAuthStore } from "@/store/authStore";
import { navGroups } from "@/config/navConfig";
import type { UserRole } from "@/types";
import * as Tooltip from "@radix-ui/react-tooltip";

function canSeeItem(roles: UserRole[] | undefined, userRole: string | undefined): boolean {
  if (!roles || roles.length === 0) return true;
  return roles.includes(userRole as UserRole);
}

export function Sidebar() {
  const { collapsed, toggleCollapsed } = useSidebar();
  const { user } = useAuthStore();

  return (
    <Tooltip.Provider delayDuration={300}>
      <aside
        className={cn(
          "relative hidden md:flex flex-col border-r border-emerald-800/40 transition-all duration-200",
          collapsed ? "w-[60px]" : "w-60"
        )}
        style={{ background: "linear-gradient(180deg, #064E3B 0%, #043927 100%)" }}
      >
        {/* ── Logo ── */}
        <div
          className={cn(
            "flex h-14 items-center border-b border-green-800/50 px-4",
            collapsed ? "justify-center" : "gap-2.5"
          )}
        >
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
            <Flag className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <span className="truncate text-sm font-bold text-white">Live scoring Pondokcabe</span>
          )}
        </div>

        {/* ── Nav ── */}
        <nav className="flex-1 overflow-y-auto py-3">
          {navGroups.map((group, gi) => {
            const visibleItems = group.items.filter((item) =>
              canSeeItem(item.roles, user?.role)
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={gi} className={cn("px-2", gi > 0 && "mt-4")}>
                {group.label && !collapsed && (
                  <p
                    className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: "#6ee7b7" }}
                  >
                    {group.label}
                  </p>
                )}
                {group.label && collapsed && (
                  <div className="mb-1 h-px bg-green-700/40 mx-1" />
                )}
                <div className="space-y-0.5">
                  {visibleItems.map((item) => (
                    <NavItemLink
                      key={item.to}
                      to={item.to}
                      icon={<item.icon className="h-4 w-4 flex-shrink-0" />}
                      label={item.label}
                      collapsed={collapsed}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* ── User footer ── */}
        {!collapsed && user && (
          <div className="border-t border-green-800/50 p-3">
            <div className="flex items-center gap-3 rounded-lg px-3 py-2 bg-white/10">
              <UserAvatar name={user.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-white">{user.name}</p>
                <p className="truncate text-[10px] text-emerald-300">{user.role}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Collapse toggle ── */}
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
          className={cn(
            "absolute -right-3 top-[52px] z-10",
            "flex h-6 w-6 items-center justify-center rounded-full",
            "border border-green-700 bg-green-800 shadow-sm",
            "text-green-200 hover:text-white transition-colors"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </aside>
    </Tooltip.Provider>
  );
}

// ─── NavItemLink ──────────────────────────────────────────────────────────────

interface NavItemLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
}

function NavItemLink({ to, icon, label, collapsed }: NavItemLinkProps) {
  const link = (
    <NavLink
      to={to}
      end={to === "/dashboard"}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
          collapsed && "justify-center px-2",
          isActive
            ? "bg-emerald-500/30 shadow-sm border border-emerald-500/40"
            : "hover:bg-white/10"
        )
      }
      style={({ isActive }) => ({
        color: isActive ? "#ffffff" : "#e2fdf0",
      })}
    >
      {icon}
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );

  if (!collapsed) return link;

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{link}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={8}
          className="z-50 rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-md"
        >
          {label}
          <Tooltip.Arrow className="fill-zinc-900" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

// ─── UserAvatar ───────────────────────────────────────────────────────────────

export function UserAvatar({
  name,
  avatarUrl,
  size = "md",
}: {
  name: string;
  avatarUrl?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = { sm: "h-7 w-7 text-xs", md: "h-8 w-8 text-sm", lg: "h-10 w-10 text-base" };
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={cn("rounded-full object-cover flex-shrink-0", sizeClass[size])}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex flex-shrink-0 items-center justify-center rounded-full bg-green-100 font-semibold text-green-700",
        sizeClass[size]
      )}
      aria-hidden
    >
      {initials}
    </div>
  );
}
