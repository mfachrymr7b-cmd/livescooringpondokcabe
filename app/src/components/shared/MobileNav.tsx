/**
 * MobileNav — slide-in drawer sidebar untuk layar mobile.
 * Menggunakan Radix Dialog sebagai accessible overlay.
 */
import { NavLink } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { Flag, X } from "lucide-react";
import { cn } from "@/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { useAuthStore } from "@/store/authStore";
import { navGroups } from "@/config/navConfig";
import { UserAvatar } from "./Sidebar";
import type { UserRole } from "@/types";

function canSeeItem(roles: UserRole[] | undefined, userRole: string | undefined): boolean {
  if (!roles || roles.length === 0) return true;
  return roles.includes(userRole as UserRole);
}

export function MobileNav() {
  const { mobileOpen, setMobileOpen } = useSidebar();
  const { user } = useAuthStore();

  function close() {
    setMobileOpen(false);
  }

  return (
    <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          )}
        />

        {/* Drawer */}
        <Dialog.Content
          aria-label="Navigasi"
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white shadow-xl md:hidden",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-left",
            "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left",
            "duration-200"
          )}
        >
          {/* Header */}
          <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-700">
                <Flag className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-bold text-zinc-900">Live scoring Pondokcabe</span>
            </div>
            <Dialog.Close asChild>
              <button
                aria-label="Tutup navigasi"
                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-3">
            {navGroups.map((group, gi) => {
              const visibleItems = group.items.filter((item) =>
                canSeeItem(item.roles, user?.role)
              );
              if (visibleItems.length === 0) return null;

              return (
                <div key={gi} className={cn("px-2", gi > 0 && "mt-4")}>
                  {group.label && (
                    <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                      {group.label}
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === "/dashboard"}
                        onClick={close}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-green-50 text-green-700"
                              : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                          )
                        }
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* User footer */}
          {user && (
            <div className="border-t border-zinc-200 p-3">
              <div className="flex items-center gap-3 rounded-lg px-3 py-2">
                <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-zinc-900">{user.name}</p>
                  <p className="truncate text-[10px] text-zinc-400">{user.role}</p>
                </div>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
