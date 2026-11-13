/**
 * HMAC-SHA256 signing shared by both directions of the n8n integration.
 *
 *   X-LendLoop-Timestamp: <unix seconds>
 *   X-LendLoop-Signature: sha256=<hex(HMAC(secret, `${timestamp}.${rawBody}`))>
 *
 * The timestamp is inside the signed string, so it can't be swapped, and requests
 * older than MAX_SKEW_SECONDS are rejected to limit replays. Writes are also
 * idempotent, so a replay inside the window can't double-apply anything.
 * Uses Web Crypto, available in Convex's default runtime.
 */

export const MAX_SKEW_SECONDS = 300;
const encoder = new TextEncoder();

export async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison (no early exit on the first differing byte). */
export function safeEqual(a: string, b: string): boolean {
  const x = encoder.encode(a);
  const y = encoder.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export async function signBody(secret: string, body: string, nowMs = Date.now()) {
  const timestamp = Math.floor(nowMs / 1000).toString();
  const signature = `sha256=${await hmacHex(secret, `${timestamp}.${body}`)}`;
  return { timestamp, signature };
}

export type VerifyResult = { ok: true; body: string } | { ok: false; status: number; error: string };

/** Verifies an inbound signed request and returns its raw body. */
export async function verifySignedRequest(
  req: Request,
  secret: string,
  nowMs = Date.now()
): Promise<VerifyResult> {
  const timestamp = req.headers.get("x-lendloop-timestamp") ?? "";
  const signature = req.headers.get("x-lendloop-signature") ?? "";
  const body = await req.text();

  if (!/^\d+$/.test(timestamp)) return { ok: false, status: 401, error: "Missing or invalid timestamp" };
  if (Math.abs(nowMs / 1000 - Number(timestamp)) > MAX_SKEW_SECONDS)
    return { ok: false, status: 401, error: "Timestamp outside the allowed window" };

  const expected = `sha256=${await hmacHex(secret, `${timestamp}.${body}`)}`;
  if (!safeEqual(expected, signature)) return { ok: false, status: 401, error: "Invalid signature" };
  return { ok: true, body };
}
