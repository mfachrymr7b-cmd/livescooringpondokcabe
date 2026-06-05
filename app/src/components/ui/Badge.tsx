import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-green-700 text-white",
        secondary: "border-transparent bg-emerald-700/50 text-[#ECFDF5]",
        destructive: "border-transparent bg-red-900/50 text-red-300",
        outline: "text-[#A7F3D0] border-emerald-600/50",
        blue: "border-transparent bg-blue-900/40 text-blue-300",
        amber: "border-transparent bg-amber-900/30 text-amber-300",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
