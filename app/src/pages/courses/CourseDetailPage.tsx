import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import {
  ArrowLeft,
  Flag,
  MapPin,
  Phone,
  Globe,
  Building2,
  Layers,
  Pencil,
  Trash2,
  Star,
  CalendarDays,
} from "lucide-react";
import { api } from "@/modules/convex/api";
import type { Id } from "@/modules/convex/dataModel";
import type { GolfCourse } from "@/modules/convex/types";
import { PageSpinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Separator } from "@/components/ui/Separator";
import { CourseFormModal } from "./components/CourseFormModal";
import { DeleteCourseModal } from "./components/DeleteCourseModal";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  championship: "Championship",
};

const DIFFICULTY_VARIANTS: Record<
  string,
  "default" | "secondary" | "blue" | "amber" | "destructive" | "outline"
> = {
  beginner: "secondary",
  intermediate: "blue",
  advanced: "amber",
  championship: "default",
};

/**
 * Parse combined description string back into its parts.
 * Format: "main desc\n\nClubhouse: ...\n\nTee Info: ..."
 */
function parseDescription(raw: string): {
  description: string;
  clubhouseInfo: string;
  teeInfo: string;
} {
  const parts = raw.split(/\n\n/);
  const mainParts: string[] = [];
  let clubhouseInfo = "";
  let teeInfo = "";

  for (const part of parts) {
    if (part.startsWith("Clubhouse: ")) {
      clubhouseInfo = part.replace("Clubhouse: ", "");
    } else if (part.startsWith("Tee Info: ")) {
      teeInfo = part.replace("Tee Info: ", "");
    } else {
      mainParts.push(part);
    }
  }

  return { description: mainParts.join("\n\n"), clubhouseInfo, teeInfo };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
        <div className="mt-0.5 text-sm text-zinc-800 break-words">{value}</div>
      </div>
    </div>
  );
}

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-3 text-center">
      <p className="text-xl font-bold tabular-nums text-zinc-900">{value}</p>
      {sub && <p className="text-xs text-zinc-400">{sub}</p>}
      <p className="mt-0.5 text-xs text-zinc-500">{label}</p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const course = useQuery(api.queries.golf_courses.get, {
    id: courseId as Id<"golf_courses">,
  });

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (course === undefined) return <PageSpinner />;

  if (!course) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
          <Flag className="h-8 w-8 text-zinc-300" />
        </div>
        <div>
          <p className="font-medium text-zinc-700">Lapangan tidak ditemukan</p>
          <p className="mt-1 text-sm text-zinc-500">
            Lapangan mungkin sudah dihapus atau ID tidak valid.
          </p>
        </div>
        <Link to="/courses">
          <Button variant="outline">Kembali ke Daftar</Button>
        </Link>
      </div>
    );
  }

  const { description, clubhouseInfo, teeInfo } = parseDescription(
    course.description ?? ""
  );

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link to="/courses">
            <Button variant="ghost" size="icon" className="mt-0.5 flex-shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900">{course.name}</h1>
              <Badge variant={course.isActive ? "default" : "outline"}>
                {course.isActive ? "Aktif" : "Nonaktif"}
              </Badge>
              <Badge variant={DIFFICULTY_VARIANTS[course.difficulty] ?? "secondary"}>
                {DIFFICULTY_LABELS[course.difficulty] ?? course.difficulty}
              </Badge>
            </div>
            <p className="mt-1 flex items-center gap-1 text-sm text-zinc-500">
              <MapPin className="h-3.5 w-3.5" />
              {course.city}, {course.province}
              <span className="mx-1 text-zinc-300">·</span>
              {course.totalHoles} holes
              <span className="mx-1 text-zinc-300">·</span>
              Par {course.par}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-shrink-0 items-center gap-2">
          <Link to={`/courses/${courseId}/holes`}>
            <Button variant="outline" size="sm">
              <Flag className="h-4 w-4" />
              Kelola Holes
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
            Hapus
          </Button>
        </div>
      </div>

      {/* ── Content grid ───────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Left column: main info */}
        <div className="space-y-4 lg:col-span-2">

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Statistik Lapangan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatBox label="Total Holes" value={String(course.totalHoles)} />
                <StatBox label="Par" value={String(course.par)} />
                {course.courseRating != null && (
                  <StatBox
                    label="Course Rating"
                    value={course.courseRating.toFixed(1)}
                  />
                )}
                {course.slopeRating != null && (
                  <StatBox label="Slope Rating" value={String(course.slopeRating)} />
                )}
                {course.establishedYear != null && (
                  <StatBox label="Tahun Berdiri" value={String(course.establishedYear)} />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          {description && (
            <Card>
              <CardHeader>
                <CardTitle>Deskripsi</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                  {description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Clubhouse Info */}
          {clubhouseInfo && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-zinc-500" />
                  <CardTitle>Clubhouse Info</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                  {clubhouseInfo}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Tee Info */}
          {teeInfo && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-zinc-500" />
                  <CardTitle>Tee Info</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                  {teeInfo}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Empty state for description section */}
          {!description && !clubhouseInfo && !teeInfo && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-zinc-400">
                  Belum ada deskripsi, info clubhouse, atau tee info.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Tambah Deskripsi
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: location + contact */}
        <div className="space-y-4">

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle>Lokasi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow
                icon={<MapPin className="h-4 w-4" />}
                label="Alamat"
                value={course.address}
              />
              <Separator />
              <InfoRow
                icon={<MapPin className="h-4 w-4" />}
                label="Kota / Provinsi"
                value={`${course.city}, ${course.province}`}
              />
              <Separator />
              <InfoRow
                icon={<MapPin className="h-4 w-4" />}
                label="Negara"
                value={course.country}
              />
              {course.latitude != null && course.longitude != null && (
                <>
                  <Separator />
                  <InfoRow
                    icon={<MapPin className="h-4 w-4" />}
                    label="Koordinat"
                    value={
                      <a
                        href={`https://maps.google.com/?q=${course.latitude},${course.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-700 hover:underline"
                      >
                        {course.latitude.toFixed(5)}, {course.longitude.toFixed(5)}
                      </a>
                    }
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* Contact */}
          {(course.phone || course.website || course.establishedYear) && (
            <Card>
              <CardHeader>
                <CardTitle>Info Tambahan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {course.establishedYear && (
                  <InfoRow
                    icon={<CalendarDays className="h-4 w-4" />}
                    label="Tahun Berdiri"
                    value={String(course.establishedYear)}
                  />
                )}
                {course.establishedYear && (course.phone || course.website) && (
                  <Separator />
                )}
                {course.phone && (
                  <InfoRow
                    icon={<Phone className="h-4 w-4" />}
                    label="Telepon"
                    value={
                      <a
                        href={`tel:${course.phone}`}
                        className="text-green-700 hover:underline"
                      >
                        {course.phone}
                      </a>
                    }
                  />
                )}
                {course.phone && course.website && <Separator />}
                {course.website && (
                  <InfoRow
                    icon={<Globe className="h-4 w-4" />}
                    label="Website"
                    value={
                      <a
                        href={course.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-green-700 hover:underline"
                      >
                        {course.website.replace(/^https?:\/\//, "")}
                      </a>
                    }
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Rating card */}
          {(course.courseRating != null || course.slopeRating != null) && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-zinc-500" />
                  <CardTitle>Rating</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {course.courseRating != null && (
                  <InfoRow
                    icon={<Star className="h-4 w-4" />}
                    label="Course Rating"
                    value={course.courseRating.toFixed(1)}
                  />
                )}
                {course.courseRating != null && course.slopeRating != null && (
                  <Separator />
                )}
                {course.slopeRating != null && (
                  <InfoRow
                    icon={<Star className="h-4 w-4" />}
                    label="Slope Rating"
                    value={String(course.slopeRating)}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <CourseFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        course={course as unknown as GolfCourse}
      />
      <DeleteCourseModal
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          navigate("/courses");
        }}
        course={course as unknown as GolfCourse}
      />
    </div>
  );
}
