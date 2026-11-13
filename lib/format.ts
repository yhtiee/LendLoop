import { differenceInCalendarDays, format, formatDistanceToNowStrict, parseISO } from "date-fns";

/** "Nov 8 – 11", "Oct 30 – Nov 2", "Dec 30, 2026 – Jan 2, 2027" */
export function formatRange(start: string, end: string) {
  const s = parseISO(start);
  const e = parseISO(end);
  if (s.getFullYear() !== e.getFullYear())
    return `${format(s, "MMM d, yyyy")} – ${format(e, "MMM d, yyyy")}`;
  if (s.getMonth() === e.getMonth())
    return start === end ? format(s, "MMM d") : `${format(s, "MMM d")} – ${format(e, "d")}`;
  return `${format(s, "MMM d")} – ${format(e, "MMM d")}`;
}

export function formatDay(day: string) {
  return format(parseISO(day), "MMM d, yyyy");
}

export function daysInRange(start: string, end: string) {
  return differenceInCalendarDays(parseISO(end), parseISO(start)) + 1;
}

/** Accepts epoch ms (Convex timestamps) or an ISO string. */
export function timeAgo(when: number | string) {
  const date = typeof when === "number" ? new Date(when) : parseISO(when);
  return `${formatDistanceToNowStrict(date)} ago`;
}

export function toISODay(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
