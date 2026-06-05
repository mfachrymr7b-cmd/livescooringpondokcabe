import { Children, cloneElement, forwardRef, isValidElement, type ReactElement } from "react";
import type { ButtonVariantProps } from "./buttonVariants";
import { buttonVariants } from "./buttonVariants";
import { Loader2 } from "lucide-react";
import { cn } from "@/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariantProps {
  asChild?: boolean;
  /** Show loading spinner and disable interaction */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const useClone =
      asChild && isValidElement(children) && Children.count(children) === 1;
    const buttonClassName = cn(buttonVariants({ variant, size, className }));

    if (useClone) {
      const childElement = children as ReactElement<Record<string, unknown>>;
      const childDisabled = (childElement.props as { disabled?: boolean }).disabled;
      const clonedProps = {
        className: cn(buttonClassName, String(childElement.props.className ?? "")),
        disabled: disabled || loading || childDisabled,
        "aria-busy": loading,
        ...props,
      } as Record<string, unknown>;
      return cloneElement(childElement, clonedProps);
    }

    return (
      <button
        className={buttonClassName}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

