import { timeAgo } from "./format";
import type { LoanEvent } from "./types";

const verb: Record<LoanEvent["kind"], string> = {
  request_notification: "Owner notified",
  status_notification: "Update emailed",
  overdue_reminder: "Reminder sent",
};

/** One-line summary of the newest automation event, e.g. "Reminder sent 2 days ago". */
export function latestActivity(events: LoanEvent[]): { text: string; failed: boolean } | null {
  const e = events[0]; // events arrive newest first
  if (!e) return null;
  return e.outcome === "failed"
    ? { text: `${verb[e.kind].split(" ")[0]} email failed ${timeAgo(e.at)}`, failed: true }
    : { text: `${verb[e.kind]} ${timeAgo(e.at)}`, failed: false };
}
