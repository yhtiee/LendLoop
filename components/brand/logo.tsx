import Link from "next/link";
import { cn } from "@/lib/utils";

/** Two linked rings: one neighbour lends, one borrows. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("size-6 shrink-0", className)}
    >
      <rect width="24" height="24" rx="6" className="fill-primary" />
      <circle cx="9.5" cy="12" r="4" fill="none" strokeWidth="2" className="stroke-primary-foreground" />
      <circle cx="14.5" cy="12" r="4" fill="none" strokeWidth="2" className="stroke-primary-foreground/60" />
    </svg>
  );
}

export function Logo({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-md font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
    >
      <LogoMark />
      <span>LendLoop</span>
    </Link>
  );
}
