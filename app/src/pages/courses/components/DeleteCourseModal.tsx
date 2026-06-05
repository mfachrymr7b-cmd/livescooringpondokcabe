import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/modules/convex/api";
import type { Id } from "@/modules/convex/dataModel";
import type { GolfCourse } from "@/modules/convex/types";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalDescription,
} from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface DeleteCourseModalProps {
  open: boolean;
  onClose: () => void;
  course: GolfCourse | null;
}

export function DeleteCourseModal({ open, onClose, course }: DeleteCourseModalProps) {
  const removeCourse = useMutation(api.mutations.golf_courses.remove);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!course) return;
    setLoading(true);
    setError(null);
    try {
      await removeCourse({ id: course._id as Id<"golf_courses"> });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus lapangan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={(v) => !v && onClose()}>
      <ModalContent className="max-w-md">
        <ModalHeader>
          <ModalTitle>Hapus Lapangan</ModalTitle>
          <ModalDescription>
            Tindakan ini tidak dapat dibatalkan. Lapangan{" "}
            <span className="font-semibold text-zinc-900">{course?.name}</span> akan
            dihapus secara permanen beserta semua data terkait.
          </ModalDescription>
        </ModalHeader>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <ModalFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Batal
          </Button>
          <Button variant="destructive" onClick={handleDelete} loading={loading}>
            Hapus Lapangan
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
