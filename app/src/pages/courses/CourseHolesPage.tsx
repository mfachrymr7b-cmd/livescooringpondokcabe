import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import {
  ArrowLeft,
  Flag,
  Pencil,
  Plus,
  CheckCircle2,
  Circle,
  ImageIcon,
  Loader2,
} from "lucide-react";
import { api } from "@/modules/convex/api";
import type { Id } from "@/modules/convex/dataModel";
import type { GolfHole } from "@/modules/convex/types";
import { PageSpinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { HoleEditModal } from "./components/HoleEditModal";
import { cn } from "@/utils";

// ─── Tee colour config ────────────────────────────────────────────────────────

const TEE_COLOURS = [
  { key: "distanceBlue" as const,   label: "Blue",   dot: "bg-blue-500",   text: "text-blue-700"  },
  { key: "distanceWhite" as const,  label: "White",  dot: "bg-zinc-300 border border-zinc-400", text: "text-zinc-600"  },
  { key: "distanceRed" as const,    label: "Red",    dot: "bg-red-500",    text: "text-red-700"   },
  { key: "distanceBlack" as const,  label: "Black",  dot: "bg-zinc-900",   text: "text-zinc-900"  },
  { key: "distanceYellow" as const, label: "Yellow", dot: "bg-yellow-400", text: "text-yellow-700"},
] as const;

// ─── Par badge ────────────────────────────────────────────────────────────────

const PAR_VARIANTS: Record<number, "secondary" | "blue" | "default"> = {
  3: "secondary",
  4: "blue",
  5: "default",
};

// ─── Hole Image ───────────────────────────────────────────────────────────────

function HoleImage({ storageId }: { storageId: string }) {
  const url = useQuery(api.queries.golf_courses.getStorageUrl, { storageId });
  if (url === undefined) {
    return (
      <div className="flex h-28 w-full items-center justify-center rounded-t-xl bg-zinc-100">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-300" />
      </div>
    );
  }
  if (!url) {
    return (
      <div className="flex h-28 w-full items-center justify-center rounded-t-xl bg-zinc-100">
        <ImageIcon className="h-5 w-5 text-zinc-300" />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt="Hole"
      className="h-28 w-full rounded-t-xl object-cover"
    />
  );
}

// ─── Hole Card ────────────────────────────────────────────────────────────────

interface HoleCardProps {
  hole: GolfHole;
  onEdit: (hole: GolfHole) => void;
}

function HoleCard({ hole, onEdit }: HoleCardProps) {
  const hasTeeData =
    hole.distanceBlue != null ||
    hole.distanceWhite != null ||
    hole.distanceRed != null ||
    hole.distanceBlack != null ||
    hole.distanceYellow != null;

  const isComplete = hasTeeData;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Image or placeholder */}
      {hole.imageUrl ? (
        <HoleImage storageId={hole.imageUrl} />
      ) : (
        <div className="flex h-28 w-full items-center justify-center rounded-t-xl bg-gradient-to-br from-green-50 to-green-100">
          <Flag className="h-8 w-8 text-green-300" />
        </div>
      )}

      {/* Completion indicator */}
      <div className="absolute right-2 top-2">
        {isComplete ? (
          <CheckCircle2 className="h-5 w-5 text-green-500 drop-shadow" />
        ) : (
          <Circle className="h-5 w-5 text-zinc-300 drop-shadow" />
        )}
      </div>

      {/* Edit button — visible on hover */}
      <button
        onClick={() => onEdit(hole)}
        className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70"
        aria-label={`Edit hole ${hole.holeNumber}`}
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-3 p-3">
        {/* Hole number + par */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Hole
            </p>
            <p className="text-2xl font-bold tabular-nums text-zinc-900">
              {hole.holeNumber}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={PAR_VARIANTS[hole.par] ?? "secondary"}>
              Par {hole.par}
            </Badge>
            <span className="text-xs text-zinc-400">HCP {hole.strokeIndex}</span>
          </div>
        </div>

        {/* Tee distances */}
        {hasTeeData ? (
          <div className="space-y-1">
            {TEE_COLOURS.filter((t) => hole[t.key] != null).map((tee) => (
              <div key={tee.key} className="flex items-center gap-2">
                <span
                  className={cn("h-2.5 w-2.5 flex-shrink-0 rounded-full", tee.dot)}
                  aria-hidden
                />
                <span className={cn("w-10 text-xs font-medium", tee.text)}>
                  {tee.label}
                </span>
                <span className="tabular-nums text-xs text-zinc-700">
                  {hole[tee.key]}m
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-400 italic">Belum ada data jarak</p>
        )}

        {/* Description snippet */}
        {hole.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-zinc-500">
            {hole.description}
          </p>
        )}

        {/* Edit button (always visible at bottom) */}
        <Button
          variant="outline"
          size="sm"
          className="mt-auto w-full"
          onClick={() => onEdit(hole)}
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit Hole
        </Button>
      </div>
    </div>
  );
}

// ─── Summary bar ─────────────────────────────────────────────────────────────

function SummaryBar({ holes, totalHoles }: { holes: GolfHole[]; totalHoles: number }) {
  const totalPar = holes.reduce((s, h) => s + h.par, 0);
  const withTee = holes.filter(
    (h) =>
      h.distanceBlue != null ||
      h.distanceWhite != null ||
      h.distanceRed != null
  ).length;
  const withImage = holes.filter((h) => h.imageUrl).length;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        { label: "Holes Terdaftar", value: `${holes.length} / ${totalHoles}` },
        { label: "Total Par", value: totalPar > 0 ? String(totalPar) : "—" },
        { label: "Dengan Jarak Tee", value: `${withTee} / ${holes.length}` },
        { label: "Dengan Gambar", value: `${withImage} / ${holes.length}` },
      ].map((s) => (
        <div key={s.label} className="rounded-lg border border-zinc-200 bg-white p-3 text-center">
          <p className="text-lg font-bold tabular-nums text-zinc-900">{s.value}</p>
          <p className="mt-0.5 text-xs text-zinc-500">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Bulk add holes ───────────────────────────────────────────────────────────

interface BulkAddProps {
  courseId: string;
  existingNumbers: number[];
  totalHoles: number;
}

function BulkAddHoles({ courseId, existingNumbers, totalHoles }: BulkAddProps) {
  const addHole = useMutation(api.mutations.golf_courses.addHole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missing = Array.from({ length: totalHoles }, (_, i) => i + 1).filter(
    (n) => !existingNumbers.includes(n)
  );

  if (missing.length === 0) return null;

  async function handleBulkAdd() {
    setLoading(true);
    setError(null);
    try {
      for (const holeNumber of missing) {
        await addHole({
          courseId: courseId as Id<"golf_courses">,
          holeNumber,
          par: 4,
          strokeIndex: holeNumber,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah holes");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-amber-800">
          {missing.length} hole belum dibuat
        </p>
        <p className="text-xs text-amber-600">
          Hole {missing.join(", ")} belum ada. Buat semua dengan Par 4 default?
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        {error && <p className="text-xs text-red-600">{error}</p>}
        <Button
          size="sm"
          variant="outline"
          onClick={handleBulkAdd}
          loading={loading}
          className="border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
        >
          <Plus className="h-3.5 w-3.5" />
          Buat {missing.length} Hole
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function CourseHolesPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [editHole, setEditHole] = useState<GolfHole | null>(null);

  const course = useQuery(api.queries.golf_courses.get, {
    id: courseId as Id<"golf_courses">,
  });
  const holes = useQuery(api.queries.golf_courses.getHoles, {
    courseId: courseId as Id<"golf_courses">,
  });

  if (course === undefined || holes === undefined) return <PageSpinner />;

  const sortedHoles = [...(holes as GolfHole[])].sort(
    (a, b) => a.holeNumber - b.holeNumber
  );
  const existingNumbers = sortedHoles.map((h) => h.holeNumber);
  const totalHoles = course?.totalHoles ?? 18;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to={`/courses/${courseId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <PageHeader
            title={`Holes — ${course?.name ?? ""}`}
            description={`${sortedHoles.length} dari ${totalHoles} hole terdaftar`}
          />
        </div>
      </div>

      {/* ── Summary ────────────────────────────────────────────────────────── */}
      {sortedHoles.length > 0 && (
        <SummaryBar holes={sortedHoles} totalHoles={totalHoles} />
      )}

      {/* ── Bulk add banner ─────────────────────────────────────────────────── */}
      {courseId && (
        <BulkAddHoles
          courseId={courseId}
          existingNumbers={existingNumbers}
          totalHoles={totalHoles}
        />
      )}

      {/* ── Hole cards ─────────────────────────────────────────────────────── */}
      {sortedHoles.length === 0 ? (
        <EmptyState
          icon={<Flag className="h-8 w-8" />}
          title="Belum ada hole"
          description={`Klik "Buat ${totalHoles} Hole" di atas untuk membuat semua hole sekaligus`}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {sortedHoles.map((hole) => (
            <HoleCard key={hole._id} hole={hole} onEdit={setEditHole} />
          ))}
        </div>
      )}

      {/* ── Edit Modal ──────────────────────────────────────────────────────── */}
      <HoleEditModal
        open={!!editHole}
        onClose={() => setEditHole(null)}
        hole={editHole}
      />
    </div>
  );
}
