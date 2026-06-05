/**
 * navConfig — sidebar navigation definition.
 * `roles` empty = all roles can see.
 */
import {
  LayoutDashboard,
  Flag,
  Trophy,
  User,
  Users,
  BarChart3,
  Radio,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/types";

export interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  roles?: UserRole[];
  children?: Omit<NavItem, "children" | "icon">[];
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    items: [
      { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    ],
  },
  {
    label: "Golf",
    items: [
      { to: "/courses",     icon: Flag,   label: "Lapangan" },
      { to: "/tournaments", icon: Trophy, label: "Turnamen" },
      { to: "/scorecards",  icon: ClipboardList, label: "Scorecards" },
      { to: "/live",        icon: Radio,  label: "Live Scoring" },
    ],
  },
  {
    label: "Admin",
    items: [
      {
        to: "/admin/users",
        icon: Users,
        label: "Pengguna",
        roles: ["super_admin", "club_admin"],
      },
      {
        to: "/admin/reports",
        icon: BarChart3,
        label: "Laporan",
        roles: ["super_admin", "club_admin", "tournament_admin"],
      },
    ],
  },
  {
    label: "Akun",
    items: [
      { to: "/profile", icon: User, label: "Profil Saya" },
    ],
  },
];
