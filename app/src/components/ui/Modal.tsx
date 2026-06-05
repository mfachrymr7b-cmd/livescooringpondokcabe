"use client";

import { forwardRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/utils";

// ─── Root ─────────────────────────────────────────────────────────────────────
const Modal        = DialogPrimitive.Root;
const ModalTrigger = DialogPrimitive.Trigger;
const ModalPortal  = DialogPrimitive.Portal;
const ModalClose   = DialogPrimitive.Close;

// ─── Overlay ──────────────────────────────────────────────────────────────────
const ModalOverlay = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=open]:fade-in-0",
      "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
      className
    )}
    {...props}
  />
));
ModalOverlay.displayName = "ModalOverlay";

// ─── Content ──────────────────────────────────────────────────────────────────
interface ModalContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /** Hide the default close (×) button */
  hideClose?: boolean;
}

const ModalContent = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  ModalContentProps
>(({ className, children, hideClose = false, ...props }, ref) => (
  <ModalPortal>
    <ModalOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
        "w-full max-w-lg max-h-[90vh] overflow-y-auto",
        "rounded-xl bg-[#065F46] shadow-xl border border-emerald-700/50",
        "p-6 flex flex-col gap-4",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        "focus:outline-none",
        className
      )}
      {...props}
    >
      {children}
      {!hideClose && (
        <DialogPrimitive.Close
          className={cn(
            "absolute right-4 top-4",
            "flex h-7 w-7 items-center justify-center rounded-md",
            "text-[#6EE7B7] hover:text-[#ECFDF5] hover:bg-emerald-700/50",
            "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
          )}
          aria-label="Tutup"
        >
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </ModalPortal>
));
ModalContent.displayName = "ModalContent";

// ─── Header ───────────────────────────────────────────────────────────────────
function ModalHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-1 pr-6", className)} {...props} />
  );
}
ModalHeader.displayName = "ModalHeader";

// ─── Footer ───────────────────────────────────────────────────────────────────
function ModalFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}
ModalFooter.displayName = "ModalFooter";

// ─── Title ────────────────────────────────────────────────────────────────────
const ModalTitle = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-tight text-[#ECFDF5]", className)}
    {...props}
  />
));
ModalTitle.displayName = "ModalTitle";

// ─── Description ─────────────────────────────────────────────────────────────
const ModalDescription = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-[#A7F3D0]", className)}
    {...props}
  />
));
ModalDescription.displayName = "ModalDescription";

export {
  Modal,
  ModalTrigger,
  ModalPortal,
  ModalOverlay,
  ModalClose,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalDescription,
};
