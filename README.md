# LendLoop

A neighbourhood tool-lending app. Neighbours list tools they're willing to lend, request to borrow
each other's for a date range, and get notifications and overdue reminders handled by n8n.

**Stack:** Next.js 16 (App Router, TypeScript) · Clerk (auth) · Convex (data, backend, HTTP actions) ·
n8n (automation) · Tailwind CSS v4 + shadcn/ui

- [What it does](#what-it-does)
- [Running it locally](#running-it-locally)
- [Environment variables](#environment-variables)
- [Architecture](#architecture)
- [Security decisions](#security-decisions)
- [Data minimisation](#data-minimisation)
- [Testing](#testing)
- [Trade-offs and known limitations](#trade-offs-and-known-limitations)
- [What I'd change for production](PRODUCTION.md)

---

## What it does

| Who | Can |
|---|---|
| **Visitor** | See a read-only list of available tools (name and category only) and sign in |
| **User** | List tools (name, category, condition, description); browse with availability and a category filter; request a date range; approve or decline requests on their own tools; mark loans returned; cancel their own pending requests |
| **Admin** | Everything a user can do, plus a separate **admin console** (`/admin`): remove any listing, view all loans, mark members as *Trusted Lender*, and see automation runs and failures |

Views: **Browse tools**, **My listings**, **My requests**, **Incoming**, each loan with an automation
timeline. The latest automation event is shown inline on every loan row, e.g. *"Reminder sent 2 days ago"*.

**Automations (n8n).**
- *Request notifications* is webhook-driven: when a request is created or its status changes, the right person gets an email.
- *Overdue reminders* is a daily schedule: it fetches overdue loans from Convex, emails each borrower, and writes the reminder status back.
- An *error workflow* reports any failed run back to the app.

Details are in [`n8n/README.md`](n8n/README.md).

---

## Running it locally

**Prerequisites:** Node 22+ (developed on Node 24), npm, a Clerk account, a Convex account, and
n8n (n8n Cloud, or Docker for self-hosting).

### 1. Install

```bash
npm install
```

### 2. Clerk

1. Create a Clerk application with Email (and any social providers you like).
2. **Integrations → Convex → Activate.** Copy the *Frontend API URL* (`https://<name>.clerk.accounts.dev`).
3. **Sessions → Customize session token**, add the claims Convex reads:
   ```json
   { "name": "{{user.full_name}}", "email": "{{user.primary_email_address}}" }
   ```
4. Copy the API keys into `.env.local` (see [`.env.example`](.env.example)).

### 3. Convex

```bash
npx convex dev            # log in, create a project; writes CONVEX_* vars to .env.local, then keep it running
```

In a second terminal, set the deployment's env vars:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<name>.clerk.accounts.dev
npx convex env set N8N_WEBHOOK_SECRET  $(openssl rand -hex 32)
npx convex env set N8N_CALLBACK_SECRET $(openssl rand -hex 32)
npx convex env set APP_URL http://localhost:3000
# after setting up n8n (step 5):
npx convex env set N8N_WEBHOOK_URL https://<your-n8n>/webhook/lendloop-events
```

### 4. Run the app

```bash
npm run dev               # http://localhost:3000
```

Sign up, then make yourself an admin. Roles live in Convex and can only be changed by someone with
deploy access:

```bash
npx convex run users:setRole '{"email":"you@example.com","role":"admin"}'
```

### 5. n8n

You can use **n8n Cloud** (what this was built and verified against) or **self-host with Docker**:

```bash
cp n8n/.env.example n8n/.env              # fill in values (secrets must match Convex)
docker compose up -d                      # n8n on :5678, Mailpit (email catcher) on :8025
docker compose --profile tunnel up -d     # public HTTPS URL so Convex Cloud can reach local n8n
```

Then import the three workflows from [`n8n/workflows/`](n8n/workflows), select the SMTP credential,
set the error workflow, and activate them. Step-by-step instructions for both options are in
[`n8n/README.md`](n8n/README.md).

### 6. Try the whole flow

1. With two accounts, A lists a tool and B requests it. A gets an email, and the loan shows *Owner notified*.
2. A approves. B gets an email, and the loan shows *Update emailed*.
3. Make the loan overdue, then run *Overdue reminders* in n8n:
   ```bash
   npx convex run dev:backdateLoan '{"loanId":"<id>","daysOverdue":2}'
   ```
   B gets a reminder and the loan shows *Reminder sent*. Running the workflow again the same day sends nothing.
4. Break the SMTP credential, or unset `N8N_WEBHOOK_URL`, and repeat step 1. The failure appears on the
   loan and in **Admin → Automations**.

---

## Environment variables

**Next.js** (`.env.local`, see [`.env.example`](.env.example))

| Name | Purpose |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk |
| `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL` | Written by `npx convex dev` |

**Convex deployment** (`npx convex env set`, declared and typed in [`convex/convex.config.ts`](convex/convex.config.ts))

| Name | Purpose |
|---|---|
| `CLERK_JWT_ISSUER_DOMAIN` | Clerk Frontend API URL; Convex verifies JWTs against it |
| `N8N_WEBHOOK_SECRET` | HMAC key for **Convex → n8n** webhooks |
| `N8N_CALLBACK_SECRET` | HMAC key for **n8n → Convex** calls |
| `N8N_WEBHOOK_URL` | Production URL of the n8n webhook. If unset, deliveries fail visibly rather than silently. |
| `APP_URL` | Base URL used in email links |

**n8n** (Cloud: *Variables*; self-hosted: `n8n/.env`)

| Name | Value |
|---|---|
| `LENDLOOP_WEBHOOK_SECRET` | same as `N8N_WEBHOOK_SECRET` |
| `LENDLOOP_CALLBACK_SECRET` | same as `N8N_CALLBACK_SECRET` |
| `LENDLOOP_CONVEX_SITE_URL` | your `https://<deployment>.convex.site` |
| `LENDLOOP_FROM_EMAIL` | optional sender address |

SMTP details live in an **n8n credential**, never in workflow JSON.

---

## Architecture

```
 Browser ─────────────── Next.js (static shell + client components)
   │  Clerk session (JWT, aud=convex)
   ▼
 Convex ── queries / mutations ── every function: requireUser / requireAdmin + ownership checks
   │
   │  loan mutation ──(same transaction)──▶ webhookDeliveries (outbox)
   │                                         │ scheduled action: sign + POST, retry 10s/1m/5m/15m
   │                                         ▼
   │                               n8n  "Request notifications"
   │                               verify HMAC → 202 → email → write back
   │                                         │
   ├─◀── POST /n8n/events   (signed, idempotent) ──────┘
   ├─◀── POST /n8n/overdue  (signed) ◀── n8n "Overdue reminders" (daily 08:00)
   └─◀── POST /n8n/failures (signed) ◀── n8n "Error handler"
```

**Request lifecycle.** A mutation validates input, checks permissions, writes the change, and in the
same transaction writes an outbox row. If the change commits, the event is guaranteed to exist. A
scheduled action delivers it to n8n so the user's request never waits on n8n. n8n acknowledges with
`202` straight away, sends the email, and signs a write-back to Convex. The loan's timeline updates
in real time through Convex's reactive queries.

**Data model** ([`convex/schema.ts`](convex/schema.ts)): `users`, `tools` (soft-deleted), `loans`
(dates stored as `YYYY-MM-DD`), `automationEvents` (unique `idempotencyKey`), `webhookDeliveries`
(outbox), `workflowErrors`, `auditLog`. Each table has an index for every access path, and every read is bounded.

**Where things live**

| Path | What |
|---|---|
| `convex/lib/auth.ts` | `requireUser`, `requireAdmin`, `requireOwnTool`: the authorisation boundary |
| `convex/tools.ts`, `loans.ts`, `admin.ts`, `users.ts` | Public API, each function guarded |
| `convex/lib/events.ts`, `webhooks.ts` | Outbox and signed delivery with retries |
| `convex/http.ts`, `automation.ts`, `lib/hmac.ts` | Signed endpoints for n8n, idempotent write-backs |
| `app/dashboard/*`, `app/admin/*` | Lending app and admin console (separate shells) |
| `components/ui/*` | shadcn/ui primitives; `app/globals.css` holds the design tokens |
| `n8n/workflows/*.json` | Exported workflows |

**Rendering.** With `cacheComponents` on, the landing page and the app chrome are prerendered static
shells. Per-user, time-dependent content streams in behind `<Suspense>`. Convex queries never read
the clock; the client passes `today`, so "overdue" and "available" are deterministic and cacheable.

---

## Security decisions

**Authentication and authorisation**
- Clerk issues the session. Convex verifies the JWT (`auth.config.ts`), and identity is always derived
  from the verified `tokenIdentifier`. Functions never accept a user id for authorisation.
- **Access control is enforced in every Convex function**, not in the UI. The UI hides what you can't
  do, and Convex refuses it regardless. Rules covered by tests:
  - Only an owner can edit or remove a tool.
  - Only the lender can approve, decline or mark a loan returned.
  - Only the borrower can cancel, and only while the request is pending.
  - You can't borrow your own tool.
  - Every admin function calls `requireAdmin`.
- **Admin powers are explicit, not a superuser.** An admin can't approve someone else's loan. They get
  exactly the three powers in the brief: remove any listing, view all loans, set Trusted Lender.
- **Roles can't be self-assigned.** New users are always `user`. `users:setRole` is an internal
  function, runnable only with deploy access. It isn't Clerk metadata a client could influence.
- The `proxy.ts` route guard only keeps signed-out visitors out of the app shell.

**Input and business rules (server-side)**
- Validators on every argument; trimmed and length-limited text.
- Dates must be valid ISO days, not in the past, at most 14 days long, and at most 90 days ahead.
- Overlapping approved loans are rejected at request time **and re-checked at approval**, since two
  approvals could otherwise race.
- One pending request per borrower per tool. Removing a tool declines its pending requests, notifies
  the borrowers, and keeps the history (soft delete).

**Integration (Convex ⇄ n8n)**
- **HMAC-SHA256 in both directions**, with a separate secret per direction:
  `sha256=HMAC(secret, "${timestamp}.${rawBody}")`.
- The receiver checks the **raw** body with a **constant-time** comparison and rejects timestamps more
  than 5 minutes off.
- **Idempotent write-backs:** the event id, or `overdue:<loan>:<day>`, is recorded once. A retry that
  succeeds after a recorded failure upgrades it to *sent*. The overdue endpoint skips loans already
  reminded today, so re-running the workflow can't double-send.
- **Retries:**
  - Convex → n8n: 5 attempts with backoff. 4xx responses aren't retried, except 408 and 429.
  - Inside n8n: 3 tries each on email and HTTP nodes.
- **No silent failures:**
  - A permanent delivery failure, an email failure, or a recipient with no address is written onto
    the loan's timeline.
  - Any other failed n8n run goes through the error workflow to **Admin → Automations**.
- Secrets live in Convex env vars and n8n Variables or credentials; none are in the repo or the
  workflow JSON. `/n8n/*` validates every field and returns `400`/`401`/`404` instead of throwing.

**Other**
- An **audit log** records listing removals, Trusted Lender changes and role changes.
- **Baseline security headers**: frame denial, `nosniff`, referrer policy, permissions policy, HSTS;
  `x-powered-by` is off.

---

## Data minimisation

- **Users:** only a display name and an email (needed for notifications) are stored. There are no
  profiles, phone numbers or addresses.
- **Visitors** get name and category only. The projection happens **in the Convex query**, so owner,
  description and condition never leave the backend.
- **Signed-in users** see other members' names, never their email addresses.
- **Webhook payloads** carry the minimum to send one email:
  - the recipient's first name and email;
  - the other party's first name;
  - the tool name, dates and a link.
  - No user ids, no request notes, no second email address. This is asserted in tests.
- **Overdue responses** include only the borrower's contact details.
- **Request notes** are visible only to the two parties (and admins); they never go to n8n.
- **Failure details** are truncated before storage, so stack traces and large error payloads aren't persisted.

---

## Testing

```bash
npm test          # Vitest + convex-test (edge-runtime)
```

There are 20 tests across [`convex/permissions.test.ts`](convex/permissions.test.ts) and
[`convex/integration.test.ts`](convex/integration.test.ts):
- every role and ownership rule above, plus the date rules and overlap protection;
- HMAC acceptance and rejection (tampered body, wrong key, stale timestamp);
- outbox payload minimisation, and recording of permanent failures;
- idempotent write-backs, including a failure upgraded to *sent*;
- overdue de-duplication.

The n8n path was verified end to end on n8n Cloud: signed event → `202`, tampered event → `401`,
email via SMTP, signed write-back, overdue reminder sent once per day, and errors reported.

> **Windows note:** if Vitest fails with `Cannot read properties of undefined (reading 'config')`,
> your shell is on a lowercase drive path (`c:\…`). Run it from `C:\…`.

---

## Trade-offs and known limitations

- **At-least-once email.** Webhook delivery retries until n8n returns `2xx`. If n8n accepted but the
  response was lost, the email could be sent twice. Write-backs are de-duplicated; de-duplicating the
  email itself is in [PRODUCTION.md](PRODUCTION.md).
- **Bounded reads instead of pagination or aggregates.** Lists are capped (100–200 rows), which is
  fine for a neighbourhood. At scale: paginate, and use `@convex-dev/aggregate` for counts.
- **"Today" is a calendar day.** The client sends its local date for display, and the server uses UTC
  for validation and reminders, with one day of slack. Per-user timezones are a production item.
- **The admin console is a UI gate plus server checks.** The UI only hides it; the guarantee is
  `requireAdmin` in every admin function.
- **Self-hosted n8n.** The workflows read secrets from n8n *Variables* (Cloud and paid plans) and fall
  back to environment variables for the community edition (the compose file enables this). The
  Docker setup is provided and documented, but the end-to-end verification was done on n8n Cloud.
- `dev:backdateLoan` is a demo helper. It's internal-only (CLI or dashboard), never callable from the browser.

---

Built for the Fluence take-home. See [PRODUCTION.md](PRODUCTION.md) for what I'd change before real users.
