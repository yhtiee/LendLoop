"use client";

import { useState } from "react";
import { toISODay } from "./format";

/**
 * Today's date in the viewer's timezone, passed to Convex queries
 * (queries can't read the clock themselves, so "overdue" and
 * "available" are computed against the day the client sends).
 */
export function useToday(): string {
  const [today] = useState(() => toISODay(new Date()));
  return today;
}
