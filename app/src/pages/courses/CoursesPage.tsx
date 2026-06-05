import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import {
  Flag,
  MapPin,
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
} from "lucide-react";
import { api } from "@/modules/convex/api";
import type { GolfCourse } from "@/modules/convex/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageSpinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  TableWrapper,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import { CourseFormModal } from "./components/CourseFormModal";
import { DeleteCourseModal } from "./components/DeleteCourseModal";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

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

// ─── Component ────────────────────────────────────────────────────────────────

export function CoursesPage() {
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [currentPage, setCurrentPage] = useState(1);

  const [addOpen, setAddOpen] = useState(false);
  const [editCourse, setEditCourse] = useState<GolfCourse | null>(null);
  const [deleteCourse, setDeleteCourse] = useState<GolfCourse | null>(null);

  const isSearching = search.trim().length >= 2;

  const searchResults = useQuery(
    api.queries.golf_courses.search,
    isSearching ? { query: search.trim(), activeOnly: false } : "skip"
  );

  const pagedResult = useQuery(
    api.queries.golf_courses.list,
    !isSearching
      ? { paginationOpts: { numItems: PAGE_SIZE, cursor } }
      : "skip"
  );

  const isLoading = isSearching
    ? searchResults === undefined
    : pagedResult === undefined;

  const courses: GolfCourse[] = useMemo(() => {
    if (isSearching) return (searchResults as GolfCourse[] | undefined) ?? [];
    return (pagedResult?.page as GolfCourse[] | undefined) ?? [];
  }, [isSearching, searchResults, pagedResult]);

  const isDone = pagedResult?.isDone ?? true;
  const continueCursor = pagedResult?.continueCursor ?? null;

  function handleNextPage() {
    if (!continueCursor || isDone) return;
    setCursorStack((prev) => [...prev, cursor]);
    setCursor(continueCursor);
    setCurrentPage((p) => p + 1);
  }

  function handlePrevPage() {
    if (currentPage <= 1) return;
    const stack = [...cursorStack];
    stack.pop();
    const prev = stack[stack.length - 1] ?? null;
    setCursorStack(stack);
    setCursor(prev);
    setCurrentPage((p) => p - 1);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setCursor(null);
    setCursorStack([null]);
    setCurrentPage(1);
  }

  function clearSearch() {
    handleSearchChange("");
  }

  if (isLoading && !isSearching) return <PageSpinner />;

  const totalShown = courses.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Lapangan Golf"
        description={
          isSearching
            ? `${totalShown} hasil untuk "${search}"`
            : `Halaman ${currentPage}`
        }
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Tambah Lapangan
          </Button>
        }
      />

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Cari nama lapangan... (min. 2 karakter)"
          className="pl-9 pr-9"
          aria-label="Cari lapangan"
        />
        {search && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
            aria-label="Hapus pencarian"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <PageSpinner />
      ) : courses.length === 0 ? (
        <EmptyState
          icon={<Flag className="h-8 w-8" />}
          title={isSearching ? "Tidak ada hasil" : "Belum ada lapangan"}
          description={
            isSearching
              ? `Tidak ditemukan lapangan dengan kata kunci "${search}"`
              : "Klik Tambah Lapangan untuk menambahkan lapangan golf pertama"
          }
          action={
            isSearching ? (
              <Button variant="outline" size="sm" onClick={clearSearch}>
                Hapus Pencarian
              </Button>
            ) : (
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                Tambah Lapangan
              </Button>
            )
          }
        />
      ) : (
        <>
          <TableWrapper>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lapangan</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead className="text-center">Holes</TableHead>
                  <TableHead className="text-center">Par</TableHead>
                  <TableHead>Kesulitan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course._id}>
                    {/* Name */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-green-100">
                          <Flag className="h-4 w-4 text-green-700" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate max-w-[180px]">
                            {course.name}
                          </p>
                          <p className="text-xs text-emerald-300 truncate max-w-[180px]">
                            {course.slug}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Location */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-white">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-emerald-300" />
                        <span className="truncate max-w-[160px]">
                          {course.city}, {course.province}
                        </span>
                      </div>
                    </TableCell>

                    {/* Holes */}
                    <TableCell className="text-center">
                      <span className="tabular-nums font-medium">{course.totalHoles}</span>
                    </TableCell>

                    {/* Par */}
                    <TableCell className="text-center">
                      <span className="tabular-nums font-medium">{course.par}</span>
                    </TableCell>

                    {/* Difficulty */}
                    <TableCell>
                      <Badge variant={DIFFICULTY_VARIANTS[course.difficulty] ?? "secondary"}>
                        {DIFFICULTY_LABELS[course.difficulty] ?? course.difficulty}
                      </Badge>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge variant={course.isActive ? "default" : "outline"}>
                        {course.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/courses/${course._id}`}>
                          <Button variant="ghost" size="icon-sm" title="Lihat detail">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Edit lapangan"
                          onClick={() => setEditCourse(course)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Hapus lapangan"
                          className="text-red-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => setDeleteCourse(course)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>

          {/* Pagination — only when not searching */}
          {!isSearching && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-white">
                Menampilkan {totalShown} lapangan · Halaman {currentPage}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={isDone || !continueCursor}
                >
                  Berikutnya
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <CourseFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />
      <CourseFormModal
        open={!!editCourse}
        onClose={() => setEditCourse(null)}
        course={editCourse}
      />
      <DeleteCourseModal
        open={!!deleteCourse}
        onClose={() => setDeleteCourse(null)}
        course={deleteCourse}
      />
    </div>
  );
}
