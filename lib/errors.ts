import { ConvexError } from "convex/values";

/** User-facing message for a failed mutation. Server rules throw ConvexError with readable text. */
export function errorMessage(err: unknown): string {
  if (err instanceof ConvexError && typeof err.data === "string") return err.data;
  return "Something went wrong. Please try again.";
}
