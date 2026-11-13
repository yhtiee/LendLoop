# What I'd change for production

LendLoop is built to be correct and secure at demo scale. These are the changes I'd make before real
users, roughly in priority order.

## 1. Delivery guarantees
- **Exactly-once email, not just at-least-once.** n8n should record each processed event id (in its
  database or a small table) and skip duplicates before sending. Convex already sends a stable event id.
- **Replay and dead-letter tooling.** Add an admin action to re-queue a failed `webhookDeliveries` row,
  and alert when the failed count is above zero.
- **Key rotation.** Add a key id to the signature header (`v1=…`) and accept two secrets during
  rotation. Rotate on a schedule and immediately after any suspected leak.
- **Pin and harden n8n.** Pin an exact n8n version, and run queue mode with Postgres and Redis for
  self-hosting. Restrict the webhook to Convex's egress and keep the editor behind SSO.

## 2. Observability
- **Sentry** in Next.js and Convex (errors, release tracking).
- Stream **Convex logs** to **Datadog**.
- Dashboards: delivery success rate, retry depth, n8n execution failures, overdue backlog.
- Alerts:
  - any permanent delivery failure;
  - error-workflow reports;
  - the overdue workflow not running for 25 hours (a dead-man's switch).
- Correlate a request end to end by passing the event id from Convex into n8n's execution logs.

## 3. Security
- **Content-Security-Policy** with nonces, allow-listing Clerk and Convex origins. Today there are only
  baseline headers.
- **Rate limiting** on `loans.request`, `tools.create` and the `/n8n/*` endpoints with
  `@convex-dev/rate-limiter`, plus Clerk bot protection on sign-up.
- **Admin hardening:**
  - require MFA for admins;
  - manage roles through an audited UI with a second-admin approval, instead of the CLI;
  - make the audit log append-only and export it (CloudTrail-style) to cold storage.
- **Clerk production instance** with its own keys; a separate Convex production deployment; secrets
  in a secret manager (e.g. AWS Secrets Manager) injected at deploy time.
- **Dependency hygiene:** Renovate or Dependabot, `npm audit` in CI, and a lockfile-only install.

## 4. Privacy and data lifecycle
- **Account deletion:** handle Clerk's `user.deleted` webhook (verified with Svix). Anonymise the
  user's row and keep loan history with a "Former member" placeholder, which the UI already supports.
- **Retention:** purge `automationEvents` and `webhookDeliveries` after N days, and stop keeping email
  addresses in outbox rows once delivered.
- **Notification preferences** and an unsubscribe link, with SPF, DKIM and DMARC on a real provider
  (SES, Resend or Postmark) and bounce handling.
- **A DPA or BAA with each vendor** if the same patterns carry over to clinical data at Fluence. Keep PHI
  out of webhook payloads entirely: send ids, and have the receiver fetch what it needs over an
  authenticated channel.

## 5. Product and scale
- **Per-user timezones.** Store each user's timezone, compute "overdue" in it, and send reminders at
  08:00 local time.
- **Pagination** (`.paginate()`) for every list, and `@convex-dev/aggregate` for counts.
- **Calendar availability** on each tool (booked ranges shown in the date picker), and a waitlist.
- **Lender reminders** (pick-up and due-today), and a "mark picked up" step between approved and active.

## 6. Delivery pipeline
- **GitHub Actions:** lint, type-check, `vitest`, and `next build` on every PR.
- **Convex preview deployments** per PR; `npx convex deploy` on merge.
- **Vercel** for Next.js, with preview URLs wired to the matching Convex preview.
- **Playwright smoke tests** for the main flows (list → request → approve → return) against a seeded
  preview deployment.
