import { Badge } from "@/components/ui/Badge";
import type { VariantProps } from "class-variance-authority";

export type MatchStatus =
  | "scheduled"
  | "ongoing"
  | "completed"
  | "cancelled"
  | "walkover";

const statusConfig: Record<
  MatchStatus,
  { label: string; variant: NonNullable<VariantProps<typeof Badge>["variant"]> }
> = {
  scheduled: { label: "Scheduled", variant: "secondary" },
  ongoing: { label: "Ongoing", variant: "blue" },
  completed: { label: "Completed", variant: "default" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  walkover: { label: "Walkover", variant: "amber" },
};

export function MatchStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as MatchStatus] ?? {
    label: status.replace("_", " "),
    variant: "outline" as const,
  };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
