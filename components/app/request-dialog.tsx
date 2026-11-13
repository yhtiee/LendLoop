"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/errors";
import { daysInRange, formatRange, toISODay } from "@/lib/format";

/** Mirrors MAX_LOAN_DAYS in convex/lib/dates.ts (the server is the source of truth). */
export const MAX_LOAN_DAYS = 14;

type RequestableTool = { _id: Id<"tools">; name: string };

export function RequestDialog({
  tool,
  open,
  onOpenChange,
}: {
  tool: RequestableTool | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const request = useMutation(api.loans.request);
  const [range, setRange] = useState<DateRange | undefined>();
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Keep the last tool so the title doesn't blank out during the close animation.
  const [shown, setShown] = useState<RequestableTool | null>(tool);
  if (tool && tool !== shown) setShown(tool);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = range?.from ? toISODay(range.from) : null;
  const end = range?.to ? toISODay(range.to) : start;
  const days = start && end ? daysInRange(start, end) : 0;
  const tooLong = days > MAX_LOAN_DAYS;

  function reset(next: boolean) {
    if (!next) {
      setRange(undefined);
      setNote("");
    }
    onOpenChange(next);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!shown || !start || !end || tooLong) return;
    setSubmitting(true);
    try {
      await request({ toolId: shown._id, startDate: start, endDate: end, note: note || undefined });
      toast.success("Request sent", {
        description: `${shown.name} · ${formatRange(start, end)}. The owner will be notified.`,
      });
      reset(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={submit} className="contents">
          <DialogHeader>
            <DialogTitle>Borrow {shown?.name}</DialogTitle>
            <DialogDescription>Choose the days you need it. The owner approves or declines.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex justify-center rounded-lg border">
              <Calendar
                mode="range"
                selected={range}
                onSelect={setRange}
                disabled={{ before: today }}
                className="w-full"
              />
            </div>
            <p className="text-center text-sm" aria-live="polite">
              {start && end ? (
                <span className={tooLong ? "text-destructive" : undefined}>
                  {formatRange(start, end)} · {days} {days === 1 ? "day" : "days"}
                  {tooLong && ` (max ${MAX_LOAN_DAYS})`}
                </span>
              ) : (
                <span className="text-muted-foreground">Select a start and end date</span>
              )}
            </p>
            <Field>
              <FieldLabel htmlFor="note">Note to owner</FieldLabel>
              <Textarea
                id="note"
                value={note}
                maxLength={280}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What's it for? (optional)"
                className="min-h-16"
              />
              <FieldDescription>Only the owner sees this.</FieldDescription>
            </Field>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={!start || tooLong || submitting}>
              {submitting ? "Sending…" : "Send request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
