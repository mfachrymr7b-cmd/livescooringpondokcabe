/**
 * Breadcrumb — auto-generate dari pathname.
 * Mendukung dynamic segments (mis. /courses/:id → nama kursus jika tersedia).
 */
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/utils";

/** Map segment ke label yang lebih ramah */
const segmentLabels: Record<string, string> = {
  dashboard: "Dashboard",
  courses: "Lapangan",
  tournaments: "Turnamen",
  profile: "Profil",
  admin: "Admin",
  users: "Pengguna",
  reports: "Laporan",
  settings: "Pengaturan",
  holes: "Hole",
  leaderboard: "Leaderboard",
};

function labelFor(segment: string): string {
  return segmentLabels[segment] ?? segment;
}

/** Apakah segment terlihat seperti ID (UUID / ObjectId / numeric) */
function isId(segment: string): boolean {
  return /^[a-z0-9]{15,}$/i.test(segment) || /^\d+$/.test(segment);
}

interface BreadcrumbProps {
  /** Override label untuk segment tertentu (mis. nama entitas dari query) */
  overrides?: Record<string, string>;
  className?: string;
}

export function Breadcrumb({ overrides = {}, className }: BreadcrumbProps) {
  const { pathname } = useLocation();

  const segments = pathname.split("/").filter(Boolean);

  // Bangun crumbs
  const crumbs = segments
    .map((seg, i) => {
      const path = "/" + segments.slice(0, i + 1).join("/");
      const label = overrides[seg] ?? (isId(seg) ? "Detail" : labelFor(seg));
      return { path, label, isLast: i === segments.length - 1 };
    })
    .filter((c) => c.label !== "Detail");

  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1 text-sm", className)}>
      <Link
        to="/dashboard"
        className="flex items-center text-[#6EE7B7] hover:text-[#ECFDF5] transition-colors"
        aria-label="Dashboard"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {crumbs.map((crumb) => (
        <span key={crumb.path} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 text-emerald-600/60" aria-hidden />
          {crumb.isLast ? (
            <span className="font-medium text-[#ECFDF5]" aria-current="page">
              {crumb.label}
            </span>
          ) : (
            <Link
              to={crumb.path}
              className="text-[#6EE7B7] hover:text-[#ECFDF5] transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
