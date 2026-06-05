/**
 * useSidebar — state untuk open/close sidebar desktop & mobile drawer.
 */
import { create } from "zustand";

interface SidebarState {
  /** Desktop sidebar collapsed (icon-only mode) */
  collapsed: boolean;
  /** Mobile drawer open */
  mobileOpen: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (v: boolean) => void;
  toggleMobile: () => void;
  setMobileOpen: (v: boolean) => void;
}

export const useSidebar = create<SidebarState>((set) => ({
  collapsed: false,
  mobileOpen: false,
  toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
  setCollapsed: (v) => set({ collapsed: v }),
  toggleMobile: () => set((s) => ({ mobileOpen: !s.mobileOpen })),
  setMobileOpen: (v) => set({ mobileOpen: v }),
}));
