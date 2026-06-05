import { Check } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export type HoleStatus = "open" | "saved";

const labels: Record<HoleStatus, string> = {
  open: "Open",
  saved: "Saved",
};

export function HoleStatusBadge({ status }: { status: HoleStatus }) {
  if (status === "saved") {
    return (
      <Badge variant="default">
        <Check className="mr-1 h-3 w-3" />
        {labels.saved}
      </Badge>
    );
  }

  return <Badge variant="outline">{labels.open}</Badge>;
}

