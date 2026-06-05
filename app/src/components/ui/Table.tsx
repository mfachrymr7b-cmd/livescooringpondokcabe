import { forwardRef } from "react";
import { cn } from "@/utils";

// ─── Root wrapper (adds horizontal scroll on small screens) ──────────────────
export const TableWrapper = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("w-full overflow-x-auto rounded-xl border border-emerald-700/50", className)}
    {...props}
  />
));
TableWrapper.displayName = "TableWrapper";

// ─── <table> ─────────────────────────────────────────────────────────────────
export const Table = forwardRef<
  HTMLTableElement,
  React.TableHTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <table
    ref={ref}
    className={cn("w-full caption-bottom text-sm", className)}
    {...props}
  />
));
Table.displayName = "Table";

// ─── <thead> ─────────────────────────────────────────────────────────────────
export const TableHeader = forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn("bg-emerald-800/50 [&_tr]:border-b [&_tr]:border-emerald-700/50", className)}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

// ─── <tbody> ─────────────────────────────────────────────────────────────────
export const TableBody = forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

// ─── <tfoot> ─────────────────────────────────────────────────────────────────
export const TableFooter = forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t border-emerald-700/50 bg-emerald-800/40 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

// ─── <tr> ─────────────────────────────────────────────────────────────────────
export const TableRow = forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-emerald-700/40 transition-colors hover:bg-emerald-700/20 data-[selected=true]:bg-emerald-700/30",
      className
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

// ─── <th> ─────────────────────────────────────────────────────────────────────
export const TableHead = forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-10 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-emerald-200",
      "[&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

// ─── <td> ─────────────────────────────────────────────────────────────────────
export const TableCell = forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "px-4 py-3 align-middle text-white [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

// ─── <caption> ───────────────────────────────────────────────────────────────
export const TableCaption = forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-3 text-sm text-emerald-300", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";
