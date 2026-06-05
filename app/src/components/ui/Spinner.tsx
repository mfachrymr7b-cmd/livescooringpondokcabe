import { Loader2 } from "lucide-react";
import { cn } from "@/utils";

interface SpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-8 w-8" };

export function Spinner({ className, size = "md" }: SpinnerProps) {
  return (
    <Loader2 className={cn("animate-spin text-zinc-400", sizeMap[size], className)} />
  );
}

export function PageSpinner() {
  return (
    <div className="flex h-full min-h-48 items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
