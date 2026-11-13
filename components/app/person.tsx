import { BadgeCheckIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function TrustedBadge({ className }: { className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <BadgeCheckIcon
          aria-label="Trusted Lender"
          className={cn("size-4 shrink-0 text-primary", className)}
        />
      </TooltipTrigger>
      <TooltipContent>Trusted Lender</TooltipContent>
    </Tooltip>
  );
}

export function Person({
  name,
  trusted,
  you,
  className,
}: {
  name: string;
  trusted?: boolean;
  you?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <Avatar className="size-6">
        <AvatarFallback className="bg-accent text-[10px] font-medium text-accent-foreground">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <span className="truncate text-sm">
        {name}
        {you && <span className="text-muted-foreground"> (you)</span>}
      </span>
      {trusted && <TrustedBadge />}
    </span>
  );
}
