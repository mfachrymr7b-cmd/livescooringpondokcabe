import { forwardRef, useId, Children, cloneElement, isValidElement } from "react";
import { cn } from "@/utils";
import { Label } from "./Label";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Field label text */
  label?: string;
  /** Helper text shown below the input */
  hint?: string;
  /** Error message — also sets aria-invalid on the child input */
  error?: string;
  /** Mark the label with a required asterisk */
  required?: boolean;
  /**
   * Explicit id to link label → input.
   * Auto-generated when omitted.
   */
  htmlFor?: string;
}

// ─── FormField ────────────────────────────────────────────────────────────────

/**
 * Wraps any form control with a label, hint, and error message.
 *
 * Usage:
 * ```tsx
 * <FormField label="Email" error={errors.email} required>
 *   <Input id="email" type="email" {...register("email")} />
 * </FormField>
 * ```
 *
 * The component injects `id`, `aria-describedby`, and `aria-invalid` onto the
 * first child element automatically when `htmlFor` / `error` are present.
 */
export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
  (
    {
      label,
      hint,
      error,
      required = false,
      htmlFor,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const autoId = useId();
    const fieldId = htmlFor ?? autoId;
    const hintId  = hint  ? `${fieldId}-hint`  : undefined;
    const errorId = error ? `${fieldId}-error` : undefined;

    const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

    // Clone the first child to inject accessibility props
    const first = Children.toArray(children)[0];
    const enhancedChildren = !isValidElement(first)
      ? children
      : Children.map(children, (child, i) => {
          if (i !== 0 || !isValidElement(child)) return child;
          return cloneElement(child as React.ReactElement<Record<string, unknown>>, {
            id: (child.props as Record<string, unknown>).id ?? fieldId,
            "aria-describedby": describedBy,
            "aria-invalid": error ? true : undefined,
            "aria-required": required || undefined,
          });
        });

    return (
      <div ref={ref} className={cn("flex flex-col gap-1.5", className)} {...props}>
        {label && (
          <Label htmlFor={fieldId}>
            {label}
            {required && (
              <span className="ml-0.5 text-red-500" aria-hidden="true">
                *
              </span>
            )}
          </Label>
        )}

        {enhancedChildren}

        {hint && !error && (
          <p id={hintId} className="text-xs text-white/70">
            {hint}
          </p>
        )}

        {error && (
          <p id={errorId} role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }
);
FormField.displayName = "FormField";
