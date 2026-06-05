import { cva, type VariantProps } from "class-variance-authority";

export const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-md text-sm font-medium",
    "transition-all duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "select-none",
  ].join(" "),
  {
    variants: {
      variant: {
        default:     "bg-green-700 !text-white shadow-sm hover:bg-green-800 active:bg-green-900 hover:shadow-md",
        secondary:   "bg-emerald-700/50 !text-[#ECFDF5] shadow-sm hover:bg-emerald-700/70 active:bg-emerald-700/90",
        outline:     "border border-emerald-600/50 bg-transparent !text-[#ECFDF5] shadow-sm hover:bg-emerald-700/30 active:bg-emerald-700/50",
        ghost:       "!text-[#A7F3D0] hover:bg-emerald-700/40 active:bg-emerald-700/60",
        destructive: "bg-red-600 !text-white shadow-sm hover:bg-red-700 active:bg-red-800",
        link:        "!text-[#F59E0B] underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm:   "h-8 px-3 text-xs rounded-md",
        md:   "h-9 px-4 py-2",
        lg:   "h-10 px-6 text-base rounded-lg",
        icon: "h-9 w-9 p-0",
        "icon-sm": "h-7 w-7 p-0 text-xs",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  }
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
