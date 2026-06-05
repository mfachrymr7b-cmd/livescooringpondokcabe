import { cn } from "@/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-emerald-600/40 bg-emerald-900/30 py-12 text-center",
        className
      )}
    >
      {icon && <div className="text-emerald-400">{icon}</div>}
      <div>
        <p className="text-sm font-medium text-emerald-100">{title}</p>
        {description && <p className="mt-1 text-xs text-emerald-300">{description}</p>}
      </div>
      {action}
    </div>
  );
}
