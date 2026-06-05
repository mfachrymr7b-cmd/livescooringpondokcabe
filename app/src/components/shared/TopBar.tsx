/**
 * TopBar — header bar dengan hamburger (mobile), breadcrumb, notifikasi, user menu.
 */
import { Menu } from "lucide-react";
import { useSidebar } from "@/hooks/useSidebar";
import { Breadcrumb } from "./Breadcrumb";
import { NotificationDropdown } from "./NotificationDropdown";
import { UserProfileMenu } from "./UserProfileMenu";

export function TopBar() {
  const { toggleMobile } = useSidebar();

  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-emerald-900/60 bg-[#111111] backdrop-blur-sm px-4 md:px-6 shadow-sm">
      {/* Left: hamburger (mobile) + breadcrumb */}
      <div className="flex items-center gap-3">
        {/* Hamburger — only on mobile */}
        <button
          onClick={toggleMobile}
          aria-label="Buka navigasi"
          className="flex h-9 w-9 items-center justify-center rounded-md text-[#A7F3D0] hover:bg-emerald-700/50 hover:text-[#ECFDF5] transition-colors md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Breadcrumb />
      </div>

      {/* Right: notifications + user menu */}
      <div className="flex items-center gap-1">
        <NotificationDropdown />
        <UserProfileMenu />
      </div>
    </header>
  );
}
