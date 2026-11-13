import { cn } from "@/lib/utils";
import type { DisplayLoanStatus } from "@/lib/domain";

/** One dot + label. Colour is reserved for states that need attention. */
const styles: Record<DisplayLoanStatus, { label: string; dot: string }> = {
  pending: { label: "Pending", dot: "bg-warning" },
  approved: { label: "Approved", dot: "bg-primary" },
  active: { label: "On loan", dot: "bg-primary" },
  overdue: { label: "Overdue", dot: "bg-destructive" },
  returned: { label: "Returned", dot: "bg-success" },
  declined: { label: "Declined", dot: "bg-ink-400" },
  cancelled: { label: "Cancelled", dot: "bg-ink-400" },
};

export function StatusBadge({
  status,
  className,
}: {
  status: DisplayLoanStatus;
  className?: string;
}) {
  const s = styles[status];
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-xs font-medium whitespace-nowrap",
        status === "overdue" && "border-destructive/30 text-destructive",
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

export function AvailabilityBadge({ available }: { available: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className={cn(
          "size-1.5 rounded-full",
          available ? "bg-success" : "bg-ink-300 dark:bg-ink-600"
        )}
      />
      {available ? "Available" : "On loan"}
    </span>
  );
}
