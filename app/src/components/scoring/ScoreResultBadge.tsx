import { Badge } from "@/components/ui/Badge";
import type { ScoreResult } from "@/utils/scoring";
import { scoreResultLabel } from "@/utils/scoring";

const variantByResult: Record<
  ScoreResult,
  "default" | "secondary" | "destructive" | "outline" | "blue" | "amber"
> = {
  albatross: "blue",
  eagle: "blue",
  birdie: "default",
  par: "secondary",
  bogey: "amber",
  double_bogey: "destructive",
  triple_plus: "destructive",
};

export function ScoreResultBadge({ result }: { result: ScoreResult }) {
  return <Badge variant={variantByResult[result]}>{scoreResultLabel(result)}</Badge>;
}

