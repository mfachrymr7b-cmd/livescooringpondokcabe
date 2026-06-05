import { cn } from "@/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div>
        <h1 className="text-xl font-bold" style={{ color: "#ffffff" }}>{title}</h1>
        {description && (
          <p className="mt-1 text-sm" style={{ color: "#a7f3d0" }}>{description}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
